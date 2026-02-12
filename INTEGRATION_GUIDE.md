# PyKV Integration Guide

## How to Use PyKV in Your Application

PyKV can be integrated into your applications in multiple ways. This guide shows practical examples for different programming languages and frameworks.

---

## Table of Contents
1. [Python Integration](#python-integration)
2. [JavaScript/Node.js Integration](#javascriptnodejs-integration)
3. [Java Integration](#java-integration)
4. [PHP Integration](#php-integration)
5. [Docker Deployment](#docker-deployment)
6. [Client Libraries](#client-libraries)
7. [Best Practices](#best-practices)

---

## Python Integration

### 1. Using Requests Library (Simple)

```python
import requests
import json

class PyKVClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def set(self, key, value, ttl=None, namespace=None):
        """Set a key-value pair"""
        url = f"{self.base_url}/set"
        if namespace:
            url += f"?ns={namespace}"
        
        payload = {"key": key, "value": value}
        if ttl:
            payload["ttl"] = ttl
        
        response = requests.post(url, json=payload)
        return response.json()
    
    def get(self, key, namespace=None):
        """Get a value by key"""
        url = f"{self.base_url}/get/{key}"
        if namespace:
            url += f"?ns={namespace}"
        
        response = requests.get(url)
        if response.status_code == 404:
            return None
        return response.json()["value"]
    
    def delete(self, key, namespace=None):
        """Delete a key"""
        url = f"{self.base_url}/delete/{key}"
        if namespace:
            url += f"?ns={namespace}"
        
        response = requests.delete(url)
        return response.status_code == 200

# Usage Example
client = PyKVClient()

# Store user session
client.set("session:user123", "active", ttl=3600, namespace="webapp")

# Retrieve session
session = client.get("session:user123", namespace="webapp")
print(session)  # "active"

# Delete session
client.delete("session:user123", namespace="webapp")
```

### 2. Using aiohttp (Async)

```python
import aiohttp
import asyncio

class AsyncPyKVClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    async def set(self, key, value, ttl=None, namespace=None):
        url = f"{self.base_url}/set"
        if namespace:
            url += f"?ns={namespace}"
        
        payload = {"key": key, "value": value}
        if ttl:
            payload["ttl"] = ttl
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                return await response.json()
    
    async def get(self, key, namespace=None):
        url = f"{self.base_url}/get/{key}"
        if namespace:
            url += f"?ns={namespace}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 404:
                    return None
                data = await response.json()
                return data["value"]

# Usage Example
async def main():
    client = AsyncPyKVClient()
    
    # Store multiple items concurrently
    await asyncio.gather(
        client.set("user:1", "alice", namespace="app1"),
        client.set("user:2", "bob", namespace="app1"),
        client.set("user:3", "charlie", namespace="app1")
    )
    
    # Retrieve
    user = await client.get("user:1", namespace="app1")
    print(user)

asyncio.run(main())
```

### 3. Flask Application Integration

```python
from flask import Flask, session, request
import requests

app = Flask(__name__)
PYKV_URL = "http://localhost:8000"

def pykv_set(key, value, ttl=None, namespace="flask_app"):
    """Store data in PyKV"""
    url = f"{PYKV_URL}/set?ns={namespace}"
    payload = {"key": key, "value": value}
    if ttl:
        payload["ttl"] = ttl
    return requests.post(url, json=payload)

def pykv_get(key, namespace="flask_app"):
    """Retrieve data from PyKV"""
    url = f"{PYKV_URL}/get/{key}?ns={namespace}"
    response = requests.get(url)
    if response.status_code == 404:
        return None
    return response.json()["value"]

@app.route('/login', methods=['POST'])
def login():
    username = request.json.get('username')
    
    # Store session in PyKV with 1 hour TTL
    session_id = generate_session_id()
    pykv_set(f"session:{session_id}", username, ttl=3600)
    
    return {"session_id": session_id}

@app.route('/profile')
def profile():
    session_id = request.headers.get('Session-ID')
    
    # Retrieve session from PyKV
    username = pykv_get(f"session:{session_id}")
    
    if not username:
        return {"error": "Invalid session"}, 401
    
    return {"username": username}

if __name__ == '__main__':
    app.run()
```

### 4. Django Integration

```python
# settings.py
PYKV_URL = "http://localhost:8000"
PYKV_NAMESPACE = "django_app"

# utils/cache.py
import requests
from django.conf import settings

class PyKVCache:
    @staticmethod
    def set(key, value, ttl=None):
        url = f"{settings.PYKV_URL}/set?ns={settings.PYKV_NAMESPACE}"
        payload = {"key": key, "value": str(value)}
        if ttl:
            payload["ttl"] = ttl
        requests.post(url, json=payload)
    
    @staticmethod
    def get(key):
        url = f"{settings.PYKV_URL}/get/{key}?ns={settings.PYKV_NAMESPACE}"
        response = requests.get(url)
        if response.status_code == 404:
            return None
        return response.json()["value"]

# views.py
from .utils.cache import PyKVCache

def product_detail(request, product_id):
    # Try cache first
    cache_key = f"product:{product_id}"
    cached_product = PyKVCache.get(cache_key)
    
    if cached_product:
        return JsonResponse(json.loads(cached_product))
    
    # Fetch from database
    product = Product.objects.get(id=product_id)
    product_data = {
        "id": product.id,
        "name": product.name,
        "price": product.price
    }
    
    # Cache for 5 minutes
    PyKVCache.set(cache_key, json.dumps(product_data), ttl=300)
    
    return JsonResponse(product_data)
```

---

## JavaScript/Node.js Integration

### 1. Using Axios (Node.js)

```javascript
const axios = require('axios');

class PyKVClient {
    constructor(baseURL = 'http://localhost:8000') {
        this.client = axios.create({ baseURL });
    }

    async set(key, value, options = {}) {
        const { ttl, namespace } = options;
        const url = namespace ? `/set?ns=${namespace}` : '/set';
        
        const payload = { key, value };
        if (ttl) payload.ttl = ttl;
        
        const response = await this.client.post(url, payload);
        return response.data;
    }

    async get(key, namespace = null) {
        const url = namespace 
            ? `/get/${key}?ns=${namespace}` 
            : `/get/${key}`;
        
        try {
            const response = await this.client.get(url);
            return response.data.value;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    async delete(key, namespace = null) {
        const url = namespace 
            ? `/delete/${key}?ns=${namespace}` 
            : `/delete/${key}`;
        
        const response = await this.client.delete(url);
        return response.status === 200;
    }
}

// Usage Example
const client = new PyKVClient();

(async () => {
    // Store user data
    await client.set('user:123', JSON.stringify({
        name: 'Alice',
        email: 'alice@example.com'
    }), { ttl: 3600, namespace: 'users' });

    // Retrieve user data
    const userData = await client.get('user:123', 'users');
    console.log(JSON.parse(userData));

    // Delete user data
    await client.delete('user:123', 'users');
})();
```

### 2. Express.js Middleware

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const pykvClient = axios.create({
    baseURL: 'http://localhost:8000'
});

// Rate limiting middleware using PyKV
async function rateLimiter(req, res, next) {
    const ip = req.ip;
    const key = `ratelimit:${ip}`;
    
    try {
        // Get current count
        const response = await pykvClient.get(`/get/${key}?ns=ratelimit`);
        const count = parseInt(response.data.value) || 0;
        
        if (count >= 100) {
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }
        
        // Increment count
        await pykvClient.post('/set?ns=ratelimit', {
            key,
            value: String(count + 1),
            ttl: 60 // Reset every minute
        });
        
        next();
    } catch (error) {
        if (error.response?.status === 404) {
            // First request
            await pykvClient.post('/set?ns=ratelimit', {
                key,
                value: '1',
                ttl: 60
            });
            next();
        } else {
            next(error);
        }
    }
}

app.use(rateLimiter);

app.get('/api/data', (req, res) => {
    res.json({ message: 'Success' });
});

app.listen(3000);
```

### 3. React Frontend Integration

```javascript
// services/pykvService.js
class PyKVService {
    constructor() {
        this.baseURL = 'http://localhost:8000';
    }

    async set(key, value, options = {}) {
        const { ttl, namespace } = options;
        const url = namespace 
            ? `${this.baseURL}/set?ns=${namespace}` 
            : `${this.baseURL}/set`;
        
        const payload = { key, value };
        if (ttl) payload.ttl = ttl;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        return response.json();
    }

    async get(key, namespace = null) {
        const url = namespace 
            ? `${this.baseURL}/get/${key}?ns=${namespace}` 
            : `${this.baseURL}/get/${key}`;
        
        const response = await fetch(url);
        
        if (response.status === 404) {
            return null;
        }
        
        const data = await response.json();
        return data.value;
    }
}

export default new PyKVService();

// Component usage
import React, { useState, useEffect } from 'react';
import pykvService from './services/pykvService';

function UserProfile({ userId }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        async function loadUser() {
            // Try cache first
            let userData = await pykvService.get(`user:${userId}`, 'webapp');
            
            if (!userData) {
                // Fetch from API
                const response = await fetch(`/api/users/${userId}`);
                userData = await response.json();
                
                // Cache for 5 minutes
                await pykvService.set(
                    `user:${userId}`, 
                    JSON.stringify(userData),
                    { ttl: 300, namespace: 'webapp' }
                );
            } else {
                userData = JSON.parse(userData);
            }
            
            setUser(userData);
        }
        
        loadUser();
    }, [userId]);

    return user ? <div>{user.name}</div> : <div>Loading...</div>;
}
```

---

## Java Integration

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import com.google.gson.Gson;
import java.util.HashMap;
import java.util.Map;

public class PyKVClient {
    private final String baseUrl;
    private final HttpClient client;
    private final Gson gson;

    public PyKVClient(String baseUrl) {
        this.baseUrl = baseUrl;
        this.client = HttpClient.newHttpClient();
        this.gson = new Gson();
    }

    public void set(String key, String value, Integer ttl, String namespace) 
            throws Exception {
        String url = baseUrl + "/set";
        if (namespace != null) {
            url += "?ns=" + namespace;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("key", key);
        payload.put("value", value);
        if (ttl != null) {
            payload.put("ttl", ttl);
        }

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(payload)))
            .build();

        client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    public String get(String key, String namespace) throws Exception {
        String url = baseUrl + "/get/" + key;
        if (namespace != null) {
            url += "?ns=" + namespace;
        }

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET()
            .build();

        HttpResponse<String> response = client.send(
            request, 
            HttpResponse.BodyHandlers.ofString()
        );

        if (response.statusCode() == 404) {
            return null;
        }

        Map<String, String> data = gson.fromJson(
            response.body(), 
            Map.class
        );
        return data.get("value");
    }

    // Usage Example
    public static void main(String[] args) throws Exception {
        PyKVClient client = new PyKVClient("http://localhost:8000");

        // Store session
        client.set("session:user123", "active", 3600, "java_app");

        // Retrieve session
        String session = client.get("session:user123", "java_app");
        System.out.println(session);
    }
}
```

---

## PHP Integration

```php
<?php

class PyKVClient {
    private $baseUrl;

    public function __construct($baseUrl = 'http://localhost:8000') {
        $this->baseUrl = $baseUrl;
    }

    public function set($key, $value, $ttl = null, $namespace = null) {
        $url = $this->baseUrl . '/set';
        if ($namespace) {
            $url .= '?ns=' . urlencode($namespace);
        }

        $payload = [
            'key' => $key,
            'value' => $value
        ];
        if ($ttl) {
            $payload['ttl'] = $ttl;
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true);
    }

    public function get($key, $namespace = null) {
        $url = $this->baseUrl . '/get/' . urlencode($key);
        if ($namespace) {
            $url .= '?ns=' . urlencode($namespace);
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode == 404) {
            return null;
        }

        $data = json_decode($response, true);
        return $data['value'];
    }
}

// Usage Example - Laravel
class UserController extends Controller {
    private $pykv;

    public function __construct() {
        $this->pykv = new PyKVClient();
    }

    public function show($id) {
        // Try cache first
        $cacheKey = "user:$id";
        $cached = $this->pykv->get($cacheKey, 'laravel_app');

        if ($cached) {
            return response()->json(json_decode($cached));
        }

        // Fetch from database
        $user = User::find($id);

        // Cache for 5 minutes
        $this->pykv->set(
            $cacheKey, 
            json_encode($user), 
            300, 
            'laravel_app'
        );

        return response()->json($user);
    }
}
?>
```

---

## Docker Deployment

### 1. Dockerfile for PyKV

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/
COPY start_pykv.py .

# Create data directory
RUN mkdir -p data

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Start server
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Docker Compose

```yaml
version: '3.8'

services:
  pykv:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - STORE_CAPACITY=10000
      - COMPACTION_INTERVAL=300
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  # Your application
  myapp:
    image: myapp:latest
    depends_on:
      - pykv
    environment:
      - PYKV_URL=http://pykv:8000
```

### 3. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pykv
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pykv
  template:
    metadata:
      labels:
        app: pykv
    spec:
      containers:
      - name: pykv
        image: pykv:latest
        ports:
        - containerPort: 8000
        env:
        - name: STORE_CAPACITY
          value: "10000"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: pykv-service
spec:
  selector:
    app: pykv
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
  type: LoadBalancer
```

---

## Client Libraries

### Create Your Own Client Library

```python
# pykv_client/__init__.py
"""
PyKV Client Library
Install: pip install requests
Usage: from pykv_client import PyKVClient
"""

import requests
from typing import Optional, Dict, Any

class PyKVClient:
    """Official PyKV Python Client"""
    
    def __init__(self, base_url: str = "http://localhost:8000", 
                 default_namespace: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.default_namespace = default_namespace
        self.session = requests.Session()
    
    def set(self, key: str, value: str, ttl: Optional[int] = None, 
            namespace: Optional[str] = None) -> Dict[str, Any]:
        """Set a key-value pair"""
        ns = namespace or self.default_namespace
        url = f"{self.base_url}/set"
        if ns:
            url += f"?ns={ns}"
        
        payload = {"key": key, "value": value}
        if ttl:
            payload["ttl"] = ttl
        
        response = self.session.post(url, json=payload)
        response.raise_for_status()
        return response.json()
    
    def get(self, key: str, namespace: Optional[str] = None) -> Optional[str]:
        """Get a value by key"""
        ns = namespace or self.default_namespace
        url = f"{self.base_url}/get/{key}"
        if ns:
            url += f"?ns={ns}"
        
        response = self.session.get(url)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()["value"]
    
    def delete(self, key: str, namespace: Optional[str] = None) -> bool:
        """Delete a key"""
        ns = namespace or self.default_namespace
        url = f"{self.base_url}/delete/{key}"
        if ns:
            url += f"?ns={ns}"
        
        response = self.session.delete(url)
        return response.status_code == 200
    
    def stats(self, namespace: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics"""
        url = f"{self.base_url}/stats"
        if namespace:
            url += f"?ns={namespace}"
        
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()
    
    def list_namespaces(self) -> list:
        """List all namespaces"""
        response = self.session.get(f"{self.base_url}/namespaces")
        response.raise_for_status()
        return response.json()["namespaces"]
    
    def clear_namespace(self, namespace: str) -> int:
        """Clear all keys in a namespace"""
        response = self.session.delete(
            f"{self.base_url}/namespaces/{namespace}"
        )
        response.raise_for_status()
        return response.json()["keys_deleted"]
```

---

## Best Practices

### 1. Connection Pooling

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def create_pykv_client():
    session = requests.Session()
    
    # Retry strategy
    retry = Retry(
        total=3,
        backoff_factor=0.3,
        status_forcelist=[500, 502, 503, 504]
    )
    
    adapter = HTTPAdapter(
        max_retries=retry,
        pool_connections=10,
        pool_maxsize=20
    )
    
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    
    return session
```

### 2. Error Handling

```python
def safe_pykv_get(key, namespace=None, default=None):
    try:
        response = requests.get(
            f"{PYKV_URL}/get/{key}?ns={namespace}",
            timeout=2
        )
        if response.status_code == 404:
            return default
        return response.json()["value"]
    except requests.exceptions.Timeout:
        logger.warning(f"PyKV timeout for key: {key}")
        return default
    except Exception as e:
        logger.error(f"PyKV error: {e}")
        return default
```

### 3. Caching Pattern

```python
def get_with_cache(key, fetch_func, ttl=300, namespace="cache"):
    # Try cache first
    cached = pykv_get(key, namespace)
    if cached:
        return json.loads(cached)
    
    # Fetch from source
    data = fetch_func()
    
    # Store in cache
    pykv_set(key, json.dumps(data), ttl, namespace)
    
    return data
```

### 4. Namespace Strategy

```python
# Organize by environment
NAMESPACE = f"{APP_NAME}:{ENVIRONMENT}"  # "myapp:production"

# Organize by feature
USER_NS = "users"
SESSION_NS = "sessions"
CACHE_NS = "cache"

# Organize by tenant
TENANT_NS = f"tenant:{tenant_id}"
```

---

## Summary

PyKV can be integrated into any application that can make HTTP requests:

1. **Python**: Use requests or aiohttp
2. **JavaScript**: Use axios or fetch
3. **Java**: Use HttpClient
4. **PHP**: Use cURL
5. **Any Language**: REST API calls

**Key Integration Points:**
- Session storage
- API response caching
- Rate limiting
- Temporary data storage
- Multi-tenant data isolation

**Production Deployment:**
- Docker containers
- Kubernetes clusters
- Behind load balancers
- With monitoring and health checks

Start with the simple HTTP client examples and build your own client library for your specific needs!
