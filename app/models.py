from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SetRequest(BaseModel):
    key: str
    value: str
    ttl: Optional[int] = None  # Time to live in seconds
    namespace: Optional[str] = None  # Namespace for multi-tenant support

class GetResponse(BaseModel):
    key: str
    value: str
    namespace: Optional[str] = None
    
class DeleteResponse(BaseModel):
    status: str
    key: str
    namespace: Optional[str] = None

class StoreStats(BaseModel):
    total_keys: int
    cache_hits: int
    cache_misses: int
    evictions: int
    log_size: int
    last_compaction: Optional[datetime]
    uptime_seconds: float
    namespaces: Optional[dict] = None  # Per-namespace statistics

class NamespaceStats(BaseModel):
    namespace: str
    total_keys: int
    cache_hits: int
    cache_misses: int
