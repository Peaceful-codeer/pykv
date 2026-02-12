# app/simple_store.py

import asyncio
import os
import time
import json
from datetime import datetime
from typing import Optional, Dict, Any
from app.async_lru import AsyncLRUCache
from app.config import STORE_CAPACITY, LOG_FILE, COMPACTION_INTERVAL


class SimpleAsyncKeyValueStore:
    """Simplified asynchronous key-value store that works without aiofiles"""
    
    def __init__(self, capacity: int = STORE_CAPACITY, log_file: str = LOG_FILE):
        self.cache = AsyncLRUCache(capacity)
        self.log_file = log_file
        self.lock = asyncio.Lock()
        
        # Statistics
        self.stats = {
            "cache_hits": 0,
            "cache_misses": 0,
            "evictions": 0,
            "log_size": 0,
            "last_compaction": None,
            "start_time": time.time()
        }
        
        # Namespace statistics
        self.namespace_stats: Dict[str, Dict[str, int]] = {}
        
        # Compaction control
        self.compaction_task = None
        self.shutdown_event = asyncio.Event()

    async def initialize(self):
        """Initialize the store and recover from log"""
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
        await self._recover()
        
    async def shutdown(self):
        """Graceful shutdown"""
        self.shutdown_event.set()
        if self.compaction_task:
            self.compaction_task.cancel()
            try:
                await self.compaction_task
            except asyncio.CancelledError:
                pass

    async def _log_operation(self, action: str, key: str, value: Optional[str] = None, ttl: Optional[int] = None, namespace: Optional[str] = None):
        """Log operation to WAL file synchronously (fallback)"""
        timestamp = time.time()
        log_entry = {
            "timestamp": timestamp,
            "action": action,
            "key": key,
            "value": value,
            "ttl": ttl,
            "namespace": namespace
        }
        
        with open(self.log_file, "a", encoding='utf-8') as f:
            f.write(json.dumps(log_entry) + "\n")
            
        self.stats["log_size"] += 1

    async def _recover(self):
        """Recover state from log file"""
        if not os.path.exists(self.log_file):
            return
            
        with open(self.log_file, "r", encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    entry = json.loads(line)
                    action = entry["action"]
                    key = entry["key"]
                    value = entry.get("value")
                    ttl = entry.get("ttl")
                    namespace = entry.get("namespace")
                    
                    full_key = self._make_namespaced_key(namespace, key)
                    
                    if action == "SET":
                        if ttl:
                            elapsed = time.time() - entry["timestamp"]
                            remaining_ttl = ttl - elapsed
                            if remaining_ttl <= 0:
                                continue
                            await self.cache.put(full_key, value, remaining_ttl)
                        else:
                            await self.cache.put(full_key, value)
                    elif action == "DEL":
                        await self.cache.delete(full_key)
                        
                except (json.JSONDecodeError, KeyError) as e:
                    print(f"Warning: Skipping malformed log entry: {line}")
                    continue

    async def set(self, key: str, value: str, ttl: Optional[int] = None, namespace: Optional[str] = None) -> None:
        """Set a key-value pair with optional TTL and namespace"""
        full_key = self._make_namespaced_key(namespace, key)
        
        async with self.lock:
            await self.cache.put(full_key, value, ttl)
            await self._log_operation("SET", key, value, ttl, namespace)
            
            self._init_namespace_stats(namespace)
            ns = namespace or "default"
            self.namespace_stats[ns]["total_keys"] = await self.size(namespace)

    async def get(self, key: str, namespace: Optional[str] = None) -> Optional[str]:
        """Get a value by key with optional namespace"""
        full_key = self._make_namespaced_key(namespace, key)
        
        async with self.lock:
            value = await self.cache.get(full_key)
            
            self._init_namespace_stats(namespace)
            ns = namespace or "default"
            
            if value is not None:
                self.stats["cache_hits"] += 1
                self.namespace_stats[ns]["cache_hits"] += 1
            else:
                self.stats["cache_misses"] += 1
                self.namespace_stats[ns]["cache_misses"] += 1
            
            return value

    async def delete(self, key: str, namespace: Optional[str] = None) -> bool:
        """Delete a key with optional namespace"""
        full_key = self._make_namespaced_key(namespace, key)
        
        async with self.lock:
            deleted = await self.cache.delete(full_key)
            if deleted:
                await self._log_operation("DEL", key, namespace=namespace)
                
                self._init_namespace_stats(namespace)
                ns = namespace or "default"
                self.namespace_stats[ns]["total_keys"] = await self.size(namespace)
            
            return deleted

    async def size(self, namespace: Optional[str] = None) -> int:
        """Get current number of keys, optionally filtered by namespace"""
        if namespace is None:
            return await self.cache.size()
        
        all_keys = await self.cache.get_all_keys()
        prefix = f"{namespace}:"
        count = sum(1 for key in all_keys if key.startswith(prefix))
        return count

    async def get_stats(self, namespace: Optional[str] = None) -> Dict[str, Any]:
        """Get store statistics, optionally filtered by namespace"""
        cache_size = await self.cache.size()
        uptime = time.time() - self.stats["start_time"]
        
        base_stats = {
            "total_keys": cache_size,
            "cache_hits": self.stats["cache_hits"],
            "cache_misses": self.stats["cache_misses"],
            "evictions": self.stats["evictions"],
            "log_size": self.stats["log_size"],
            "last_compaction": self.stats["last_compaction"],
            "uptime_seconds": uptime
        }
        
        if namespace:
            self._init_namespace_stats(namespace)
            ns = namespace or "default"
            base_stats["namespace"] = namespace
            base_stats["namespace_stats"] = self.namespace_stats[ns]
            base_stats["total_keys"] = await self.size(namespace)
        else:
            base_stats["namespaces"] = self.namespace_stats
        
        return base_stats

    async def start_compaction_task(self):
        """Start background log compaction task"""
        self.compaction_task = asyncio.create_task(self._compaction_loop())

    async def _compaction_loop(self):
        """Background task for periodic log compaction"""
        while not self.shutdown_event.is_set():
            try:
                await asyncio.sleep(COMPACTION_INTERVAL)
                if not self.shutdown_event.is_set():
                    await self.compact_log()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in compaction loop: {e}")

    async def compact_log(self):
        """Compact the log file by removing obsolete entries"""
        if not os.path.exists(self.log_file):
            return
            
        print("Starting log compaction...")
        
        async with self.lock:
            current_state = {}
            cache_keys = await self.cache.get_all_keys()
            
            for full_key in cache_keys:
                value = await self.cache.get_raw(full_key)
                if value is not None:
                    current_state[full_key] = value
            
            temp_file = self.log_file + ".tmp"
            with open(temp_file, "w", encoding='utf-8') as f:
                for full_key, (value, expires_at) in current_state.items():
                    ttl = None
                    if expires_at:
                        ttl = max(0, int(expires_at - time.time()))
                        if ttl <= 0:
                            continue
                    
                    namespace, key = self._parse_namespaced_key(full_key)
                    
                    log_entry = {
                        "timestamp": time.time(),
                        "action": "SET",
                        "key": key,
                        "value": value,
                        "ttl": ttl,
                        "namespace": namespace
                    }
                    f.write(json.dumps(log_entry) + "\n")
            
            if os.path.exists(temp_file):
                if os.path.exists(self.log_file):
                    backup_file = f"{self.log_file}.backup.{int(time.time())}"
                    os.rename(self.log_file, backup_file)
                
                os.rename(temp_file, self.log_file)
                
                self.stats["last_compaction"] = datetime.now()
                
                new_size = 0
                if os.path.exists(self.log_file):
                    with open(self.log_file, "r", encoding='utf-8') as f:
                        for _ in f:
                            new_size += 1
                
                old_size = self.stats["log_size"]
                self.stats["log_size"] = new_size
                
                print(f"Log compaction completed: {old_size} -> {new_size} entries")
    
    async def list_namespaces(self) -> list[str]:
        """List all active namespaces"""
        all_keys = await self.cache.get_all_keys()
        namespaces = set()
        
        for key in all_keys:
            if ":" in key:
                namespace, _ = self._parse_namespaced_key(key)
                if namespace:
                    namespaces.add(namespace)
        
        return sorted(list(namespaces))
    
    async def clear_namespace(self, namespace: str) -> int:
        """Clear all keys in a namespace. Returns number of keys deleted."""
        all_keys = await self.cache.get_all_keys()
        prefix = f"{namespace}:"
        deleted_count = 0
        
        for full_key in all_keys:
            if full_key.startswith(prefix):
                await self.cache.delete(full_key)
                deleted_count += 1
                
                _, key = self._parse_namespaced_key(full_key)
                await self._log_operation("DEL", key, namespace=namespace)
        
        if namespace in self.namespace_stats:
            self.namespace_stats[namespace]["total_keys"] = 0
        
        return deleted_count
    
    def _make_namespaced_key(self, namespace: Optional[str], key: str) -> str:
        """Create a namespaced key"""
        if namespace:
            return f"{namespace}:{key}"
        return key
    
    def _parse_namespaced_key(self, full_key: str) -> tuple[Optional[str], str]:
        """Parse a namespaced key into namespace and key"""
        if ":" in full_key:
            parts = full_key.split(":", 1)
            return parts[0], parts[1]
        return None, full_key
    
    def _init_namespace_stats(self, namespace: Optional[str]):
        """Initialize statistics for a namespace"""
        ns = namespace or "default"
        if ns not in self.namespace_stats:
            self.namespace_stats[ns] = {
                "cache_hits": 0,
                "cache_misses": 0,
                "total_keys": 0
            }
