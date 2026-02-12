"""
PyKV Python Client - Ready to Use
Copy this file to your project and start using PyKV!
"""

import requests
from typing import Optional, Dict, Any
import json


class PyKVClient:
    """
    Simple PyKV Client for Python Applications
    
    Usage:
        client = PyKVClient("http://localhost:8000")
        client.set("user:123", "alice", ttl=3600, namespace="myapp")
        value = client.get("user:123", namespace="myapp")
    """
    
    def __init__(self, base_url: str = "http://localhost:8000", 
                 default_namespace: Optional[str] = None,
                 timeout: int = 5):
        """
        Initialize PyKV client
        
        Args:
            base_url: PyKV server URL
            default_namespace: Default namespace for all operations
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.default_namespace = default_namespace
        self.timeout = timeout
        self.session = requests.Session()
    
    def set(self, key: str, value: str, ttl: Optional[int] = None, 
            namespace: Optional[str] = None) -> Dict[str, Any]:
        """
        Store a key-value pair
        
        Args:
            key: The key to store
            value: The value to store
            ttl: Time to live in seconds (optional)
            namespace: Namespace for isolation (optional)
        
        Returns:
            Response dict with status and key
        
        Example:
            client.set("session:abc", "user123", ttl=3600, namespace="webapp")
        """
        ns = namespace or self.default_namespace
        url = f"{self.base_url}/set"
        if ns:
            url += f"?ns={ns}"
        
        payload = {"key": key, "value": value}
        if ttl:
            payload["ttl"] = ttl
        
        try:
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise PyKVError(f"Failed to set key '{key}': {e}")
    
    def get(self, key: str, namespace: Optional[str] = None, 
            default: Any = None) -> Optional[str]:
        """
        Retrieve a value by key
        
        Args:
            key: The key to retrieve
            namespace: Namespace for isolation (optional)
            default: Default value if key not found
        
        Returns:
            The value or default if not found
        
        Example:
            value = client.get("session:abc", namespace="webapp")
        """
        ns = namespace or self.default_namespace
        url = f"{self.base_url}/get/{key}"
        if ns:
            url += f"?ns={ns}"
        
        try:
            response = self.session.get(url, timeout=self.timeout)
            if response.status_code == 404:
                return default
            response.raise_for_status()
            return response.json()["value"]
        except requests.exceptions.RequestException as e:
            raise PyKVError(f"Failed to get key '{key}': {e}")
    
    def delete(self, key: str, namespace: Optional[str] = None) -> bool:
        """
        Delete a key
        
        Args:
            key: The key to delete
            namespace: Namespace for isolation (optional)
        
        Returns:
            True if deleted, False if not found
        
        Example:
            deleted = client.delete("session:abc", namespace="webapp")
        """
        ns = namespace or self.default_namespace
        url = f"{self.base_url}/delete/{key}"
        if ns:
            url += f"?ns={ns}"
        
        try:
            response = self.session.delete(url, timeout=self.timeout)
            return response.status_code == 200
        except requests.exceptions.RequestException as e:
            raise PyKVError(f"Failed to delete key '{key}': {e}")
    
    def stats(self, namespace: Optional[str] = None) -> Dict[str, Any]:
        """
        Get statistics
        
        Args:
            namespace: Get stats for specific namespace (optional)
        
        Returns:
            Statistics dictionary
        
        Example:
            stats = client.stats(namespace="webapp")
        """
        url = f"{self.base_url}/stats"
        if namespace:
            url += f"?ns={namespace}"
        
        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise PyKVError(f"Failed to get stats: {e}")
    
    def list_namespaces(self) -> list:
        """
        List all active namespaces
        
        Returns:
            List of namespace names
        
        Example:
            namespaces = client.list_namespaces()
        """
        try:
            response = self.session.get(
                f"{self.base_url}/namespaces", 
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()["namespaces"]
        except requests.exceptions.RequestException as e:
            raise PyKVError(f"Failed to list namespaces: {e}")
    
    def clear_namespace(self, namespace: str) -> int:
        """
        Clear all keys in a namespace
        
        Args:
            namespace: Namespace to clear
        
        Returns:
            Number of keys deleted
        
        Example:
            deleted = client.clear_namespace("webapp")
        """
        try:
            response = self.session.delete(
                f"{self.base_url}/namespaces/{namespace}",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()["keys_deleted"]
        except requests.exceptions.RequestException as e:
            raise PyKVError(f"Failed to clear namespace '{namespace}': {e}")
    
    def health_check(self) -> bool:
        """
        Check if PyKV server is healthy
        
        Returns:
            True if healthy, False otherwise
        
        Example:
            if client.health_check():
                print("Server is healthy")
        """
        try:
            response = self.session.get(
                f"{self.base_url}/health", 
                timeout=self.timeout
            )
            return response.status_code == 200
        except:
            return False
    
    def close(self):
        """Close the session"""
        self.session.close()
    
    def __enter__(self):
        """Context manager support"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager cleanup"""
        self.close()


class PyKVError(Exception):
    """PyKV client error"""
    pass


# ============================================
# USAGE EXAMPLES
# ============================================

if __name__ == "__main__":
    # Example 1: Basic Usage
    print("Example 1: Basic Usage")
    client = PyKVClient("http://localhost:8000")
    
    # Store a value
    client.set("user:123", "alice")
    
    # Retrieve a value
    value = client.get("user:123")
    print(f"Value: {value}")
    
    # Delete a value
    client.delete("user:123")
    print()
    
    # Example 2: With Namespace
    print("Example 2: With Namespace")
    client.set("user:456", "bob", namespace="app1")
    client.set("user:456", "charlie", namespace="app2")
    
    print(f"App1 user: {client.get('user:456', namespace='app1')}")
    print(f"App2 user: {client.get('user:456', namespace='app2')}")
    print()
    
    # Example 3: With TTL
    print("Example 3: With TTL (expires in 60 seconds)")
    client.set("session:xyz", "active", ttl=60, namespace="sessions")
    print(f"Session: {client.get('session:xyz', namespace='sessions')}")
    print()
    
    # Example 4: Caching Pattern
    print("Example 4: Caching Pattern")
    
    def get_user_from_db(user_id):
        """Simulate database fetch"""
        print(f"  Fetching user {user_id} from database...")
        return {"id": user_id, "name": "Alice", "email": "alice@example.com"}
    
    def get_user_cached(user_id):
        """Get user with caching"""
        cache_key = f"user:{user_id}"
        
        # Try cache first
        cached = client.get(cache_key, namespace="cache")
        if cached:
            print("  Cache hit!")
            return json.loads(cached)
        
        # Fetch from database
        print("  Cache miss!")
        user = get_user_from_db(user_id)
        
        # Store in cache for 5 minutes
        client.set(cache_key, json.dumps(user), ttl=300, namespace="cache")
        
        return user
    
    # First call - cache miss
    user1 = get_user_cached(123)
    print(f"  User: {user1}")
    
    # Second call - cache hit
    user2 = get_user_cached(123)
    print(f"  User: {user2}")
    print()
    
    # Example 5: Statistics
    print("Example 5: Statistics")
    stats = client.stats()
    print(f"Total keys: {stats['total_keys']}")
    print(f"Cache hits: {stats['cache_hits']}")
    print(f"Cache misses: {stats['cache_misses']}")
    print()
    
    # Example 6: Namespace Management
    print("Example 6: Namespace Management")
    namespaces = client.list_namespaces()
    print(f"Active namespaces: {namespaces}")
    
    # Example 7: Context Manager
    print("\nExample 7: Context Manager")
    with PyKVClient("http://localhost:8000", default_namespace="myapp") as client:
        client.set("temp:data", "value")
        print(f"Temp data: {client.get('temp:data')}")
    
    print("\nAll examples completed!")
