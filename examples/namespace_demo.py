#!/usr/bin/env python3
"""
PyKV Namespace Demo
Demonstrates multi-tenant isolation using namespaces
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def demo_basic_namespaces():
    """Demo: Basic namespace usage"""
    print("=" * 60)
    print("Demo 1: Basic Namespace Usage")
    print("=" * 60)
    
    # Set keys in different namespaces
    print("\n1. Setting keys in different namespaces...")
    
    # App1 namespace
    requests.post(f"{BASE_URL}/set?ns=app1", json={
        "key": "user:123",
        "value": "alice_app1"
    })
    print("   ✓ SET app1:user:123 = alice_app1")
    
    # App2 namespace
    requests.post(f"{BASE_URL}/set?ns=app2", json={
        "key": "user:123",
        "value": "bob_app2"
    })
    print("   ✓ SET app2:user:123 = bob_app2")
    
    # Default namespace (no namespace)
    requests.post(f"{BASE_URL}/set", json={
        "key": "user:123",
        "value": "charlie_default"
    })
    print("   ✓ SET user:123 = charlie_default (no namespace)")
    
    # Get keys from different namespaces
    print("\n2. Getting keys from different namespaces...")
    
    response = requests.get(f"{BASE_URL}/get/user:123?ns=app1")
    print(f"   GET app1:user:123 = {response.json()['value']}")
    
    response = requests.get(f"{BASE_URL}/get/user:123?ns=app2")
    print(f"   GET app2:user:123 = {response.json()['value']}")
    
    response = requests.get(f"{BASE_URL}/get/user:123")
    print(f"   GET user:123 = {response.json()['value']} (no namespace)")
    
    print("\n✓ Keys are isolated by namespace!")


def demo_multi_tenant_saas():
    """Demo: Multi-tenant SaaS application"""
    print("\n" + "=" * 60)
    print("Demo 2: Multi-Tenant SaaS Application")
    print("=" * 60)
    
    # Simulate different tenants
    tenants = ["tenant_acme", "tenant_globex", "tenant_initech"]
    
    print("\n1. Setting up data for multiple tenants...")
    for tenant in tenants:
        # User data
        requests.post(f"{BASE_URL}/set?ns={tenant}", json={
            "key": "config:theme",
            "value": f"{tenant}_theme"
        })
        
        # Session data
        requests.post(f"{BASE_URL}/set?ns={tenant}", json={
            "key": "session:active_users",
            "value": "42",
            "ttl": 3600
        })
        
        print(f"   ✓ Configured {tenant}")
    
    # List all namespaces
    print("\n2. Listing all active namespaces...")
    response = requests.get(f"{BASE_URL}/namespaces")
    data = response.json()
    print(f"   Active namespaces: {', '.join(data['namespaces'])}")
    print(f"   Total: {data['count']} tenants")
    
    # Get stats per namespace
    print("\n3. Getting statistics per tenant...")
    for tenant in tenants:
        response = requests.get(f"{BASE_URL}/namespaces/{tenant}/keys")
        data = response.json()
        print(f"   {tenant}: {data['total_keys']} keys")


def demo_environment_isolation():
    """Demo: Environment isolation (dev/staging/prod)"""
    print("\n" + "=" * 60)
    print("Demo 3: Environment Isolation")
    print("=" * 60)
    
    environments = ["dev", "staging", "prod"]
    
    print("\n1. Setting configuration for each environment...")
    for env in environments:
        requests.post(f"{BASE_URL}/set?ns={env}", json={
            "key": "config:db_host",
            "value": f"db-{env}.example.com"
        })
        
        requests.post(f"{BASE_URL}/set?ns={env}", json={
            "key": "config:api_key",
            "value": f"key_{env}_secret123"
        })
        
        requests.post(f"{BASE_URL}/set?ns={env}", json={
            "key": "config:debug",
            "value": "true" if env == "dev" else "false"
        })
        
        print(f"   ✓ Configured {env} environment")
    
    print("\n2. Reading configuration from production...")
    response = requests.get(f"{BASE_URL}/get/config:db_host?ns=prod")
    print(f"   DB Host: {response.json()['value']}")
    
    response = requests.get(f"{BASE_URL}/get/config:debug?ns=prod")
    print(f"   Debug Mode: {response.json()['value']}")
    
    print("\n3. Clearing staging environment...")
    response = requests.delete(f"{BASE_URL}/namespaces/staging")
    data = response.json()
    print(f"   ✓ Deleted {data['keys_deleted']} keys from staging")


def demo_microservices():
    """Demo: Microservices architecture"""
    print("\n" + "=" * 60)
    print("Demo 4: Microservices Architecture")
    print("=" * 60)
    
    services = {
        "auth": ["session:user1", "token:abc123"],
        "payment": ["transaction:tx001", "balance:user1"],
        "notification": ["queue:email", "queue:sms"],
        "analytics": ["metric:page_views", "metric:conversions"]
    }
    
    print("\n1. Each microservice uses its own namespace...")
    for service, keys in services.items():
        for key in keys:
            requests.post(f"{BASE_URL}/set?ns={service}", json={
                "key": key,
                "value": f"data_for_{key}"
            })
        print(f"   ✓ {service}: {len(keys)} keys")
    
    print("\n2. Getting namespace statistics...")
    response = requests.get(f"{BASE_URL}/stats")
    stats = response.json()
    
    print(f"\n   Global Stats:")
    print(f"   - Total keys: {stats['total_keys']}")
    print(f"   - Cache hits: {stats['cache_hits']}")
    
    if 'namespaces' in stats:
        print(f"\n   Per-Service Stats:")
        for ns, ns_stats in stats['namespaces'].items():
            print(f"   - {ns}: {ns_stats['total_keys']} keys, "
                  f"{ns_stats['cache_hits']} hits, "
                  f"{ns_stats['cache_misses']} misses")


def demo_session_storage():
    """Demo: Session storage with TTL"""
    print("\n" + "=" * 60)
    print("Demo 5: Session Storage with TTL")
    print("=" * 60)
    
    print("\n1. Creating sessions for different apps...")
    
    # Web app sessions
    requests.post(f"{BASE_URL}/set?ns=webapp", json={
        "key": "session:user_alice",
        "value": json.dumps({"user_id": "alice", "role": "admin"}),
        "ttl": 3600  # 1 hour
    })
    print("   ✓ webapp:session:user_alice (expires in 1 hour)")
    
    # Mobile app sessions
    requests.post(f"{BASE_URL}/set?ns=mobileapp", json={
        "key": "session:user_bob",
        "value": json.dumps({"user_id": "bob", "role": "user"}),
        "ttl": 7200  # 2 hours
    })
    print("   ✓ mobileapp:session:user_bob (expires in 2 hours)")
    
    # API sessions
    requests.post(f"{BASE_URL}/set?ns=api", json={
        "key": "session:client_xyz",
        "value": json.dumps({"client_id": "xyz", "scope": "read"}),
        "ttl": 1800  # 30 minutes
    })
    print("   ✓ api:session:client_xyz (expires in 30 minutes)")
    
    print("\n2. Checking session counts per app...")
    for app in ["webapp", "mobileapp", "api"]:
        response = requests.get(f"{BASE_URL}/namespaces/{app}/keys")
        print(f"   {app}: {response.json()['total_keys']} active sessions")


def main():
    """Run all demos"""
    print("\n" + "=" * 60)
    print("PyKV Multi-Tenant Namespace Demo")
    print("=" * 60)
    print("\nMake sure PyKV server is running on http://127.0.0.1:8000")
    print("Start with: python start_pykv.py")
    
    try:
        # Check if server is running
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        if response.status_code != 200:
            print("\n❌ Error: PyKV server is not responding")
            return
    except requests.exceptions.RequestException:
        print("\n❌ Error: Cannot connect to PyKV server")
        print("Please start the server first: python start_pykv.py")
        return
    
    # Run demos
    demo_basic_namespaces()
    demo_multi_tenant_saas()
    demo_environment_isolation()
    demo_microservices()
    demo_session_storage()
    
    print("\n" + "=" * 60)
    print("Demo Complete!")
    print("=" * 60)
    print("\nKey Takeaways:")
    print("✓ Namespaces provide complete key isolation")
    print("✓ Perfect for multi-tenant SaaS applications")
    print("✓ Separate environments (dev/staging/prod)")
    print("✓ Microservices can use dedicated namespaces")
    print("✓ Per-namespace statistics and management")
    print("\nAPI Documentation: http://127.0.0.1:8000/docs")


if __name__ == "__main__":
    main()
