# PyKV Namespace Feature Guide

## Overview

PyKV now supports **multi-tenant namespaces** for complete key isolation. This enables multiple applications, environments, or teams to use the same PyKV instance without key collisions.

## Why Namespaces?

### Problem
Without namespaces:
```python
SET user:123 "alice"  # Which app does this belong to?
```

### Solution
With namespaces:
```python
SET app1:user:123 "alice"
SET app2:user:123 "bob"
SET dev:user:123 "charlie"
```

## API Usage

### 1. Set with Namespace

**Query Parameter:**
```http
POST /set?ns=app1
{
  "key": "user:123",
  "value": "alice",
  "ttl": 3600
}
```

**Request Body:**
```http
POST /set
{
  "key": "user:123",
  "value": "alice",
  "namespace": "app1",
  "ttl": 3600
}
```

### 2. Get with Namespace

```http
GET /get/user:123?ns=app1
```

Response:
```json
{
  "key": "user:123",
  "value": "alice",
  "namespace": "app1"
}
```

### 3. Delete with Namespace

```http
DELETE /delete/user:123?ns=app1
```

### 4. List All Namespaces

```http
GET /namespaces
```

Response:
```json
{
  "namespaces": ["app1", "app2", "dev", "prod"],
  "count": 4
}
```

### 5. Get Namespace Size

```http
GET /namespaces/app1/keys
```

Response:
```json
{
  "namespace": "app1",
  "total_keys": 150
}
```

### 6. Clear Namespace

```http
DELETE /namespaces/app1
```

Response:
```json
{
  "status": "cleared",
  "namespace": "app1",
  "keys_deleted": 150
}
```

### 7. Namespace Statistics

**Global stats with per-namespace breakdown:**
```http
GET /stats
```

Response:
```json
{
  "total_keys": 250,
  "cache_hits": 1500,
  "cache_misses": 50,
  "namespaces": {
    "app1": {
      "cache_hits": 800,
      "cache_misses": 20,
      "total_keys": 100
    },
    "app2": {
      "cache_hits": 700,
      "cache_misses": 30,
      "total_keys": 150
    }
  }
}
```

**Stats for specific namespace:**
```http
GET /stats?ns=app1
```

## Use Cases

### 1. Multi-Tenant SaaS

```python
# Tenant A
POST /set?ns=tenant_acme {"key": "config:theme", "value": "dark"}
POST /set?ns=tenant_acme {"key": "user:count", "value": "1500"}

# Tenant B
POST /set?ns=tenant_globex {"key": "config:theme", "value": "light"}
POST /set?ns=tenant_globex {"key": "user:count", "value": "3200"}

# Complete isolation - no conflicts!
```

### 2. Environment Separation

```python
# Development
POST /set?ns=dev {"key": "db:host", "value": "localhost"}
POST /set?ns=dev {"key": "debug", "value": "true"}

# Staging
POST /set?ns=staging {"key": "db:host", "value": "staging-db.example.com"}
POST /set?ns=staging {"key": "debug", "value": "false"}

# Production
POST /set?ns=prod {"key": "db:host", "value": "prod-db.example.com"}
POST /set?ns=prod {"key": "debug", "value": "false"}
```

### 3. Microservices Architecture

```python
# Auth Service
POST /set?ns=auth {"key": "session:user1", "value": "token_abc"}
POST /set?ns=auth {"key": "refresh:user1", "value": "refresh_xyz"}

# Payment Service
POST /set?ns=payment {"key": "transaction:tx001", "value": "pending"}
POST /set?ns=payment {"key": "balance:user1", "value": "1000.00"}

# Notification Service
POST /set?ns=notification {"key": "queue:email", "value": "100"}
POST /set?ns=notification {"key": "queue:sms", "value": "50"}

# Analytics Service
POST /set?ns=analytics {"key": "metric:page_views", "value": "50000"}
POST /set?ns=analytics {"key": "metric:conversions", "value": "1250"}
```

### 4. Session Storage by Platform

```python
# Web App Sessions
POST /set?ns=webapp {
  "key": "session:alice",
  "value": "{\"user_id\": \"alice\", \"role\": \"admin\"}",
  "ttl": 3600
}

# Mobile App Sessions
POST /set?ns=mobileapp {
  "key": "session:bob",
  "value": "{\"user_id\": \"bob\", \"role\": \"user\"}",
  "ttl": 7200
}

# API Sessions
POST /set?ns=api {
  "key": "session:client_xyz",
  "value": "{\"client_id\": \"xyz\", \"scope\": \"read\"}",
  "ttl": 1800
}
```

## Python Client Example

```python
import requests

BASE_URL = "http://127.0.0.1:8000"

# Set with namespace
requests.post(f"{BASE_URL}/set?ns=app1", json={
    "key": "user:123",
    "value": "alice"
})

# Get with namespace
response = requests.get(f"{BASE_URL}/get/user:123?ns=app1")
print(response.json()["value"])  # alice

# List namespaces
response = requests.get(f"{BASE_URL}/namespaces")
print(response.json()["namespaces"])  # ['app1', 'app2', ...]

# Clear namespace
requests.delete(f"{BASE_URL}/namespaces/app1")
```

## Implementation Details

### Internal Key Format

Internally, PyKV stores namespaced keys as:
```
{namespace}:{key}
```

Examples:
- `app1:user:123`
- `dev:config:db`
- `auth:session:abc`

### Default Namespace

Keys without a namespace are stored as-is (no prefix). This maintains backward compatibility.

### Namespace Statistics

Each namespace tracks:
- `cache_hits`: Number of successful GET operations
- `cache_misses`: Number of failed GET operations
- `total_keys`: Current number of keys in namespace

### Persistence

Namespaces are persisted in the WAL (Write-Ahead Log):
```json
{
  "timestamp": 1234567890.123,
  "action": "SET",
  "key": "user:123",
  "value": "alice",
  "namespace": "app1",
  "ttl": 3600
}
```

## Demo

Run the comprehensive demo:
```bash
python examples/namespace_demo.py
```

This demonstrates:
- Basic namespace usage
- Multi-tenant SaaS scenarios
- Environment isolation
- Microservices architecture
- Session storage with TTL

## Benefits

✅ **Complete Isolation**: Keys in different namespaces never conflict  
✅ **Multi-Tenancy**: Support multiple customers on one instance  
✅ **Environment Separation**: Dev/staging/prod on same server  
✅ **Microservices Ready**: Each service gets its own namespace  
✅ **Per-Namespace Stats**: Monitor each namespace independently  
✅ **Bulk Operations**: Clear entire namespaces at once  
✅ **Backward Compatible**: Existing code works without changes  

## Best Practices

1. **Use descriptive namespace names**: `tenant_acme` not `t1`
2. **Consistent naming**: Use same pattern across your app
3. **Monitor per-namespace**: Track stats for each namespace
4. **Clean up unused namespaces**: Use `DELETE /namespaces/{ns}`
5. **Document your namespaces**: Keep track of what each one is for

## USP

> **PyKV supports multi-tenant isolation out of the box** - perfect for SaaS platforms, microservices, and multi-environment deployments.
