# How to Use PyKV in Your Application

## 🎯 Overview

PyKV is a REST API-based key-value store. Any application that can make HTTP requests can use PyKV!

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start PyKV Server

```bash
cd pykv
python start_pykv.py
```

Server runs at: `http://localhost:8000`

### Step 2: Open Web UI

Open `ui/index.html` in your browser and click the **"Integration"** tab to see:
- ✅ Code examples in 6+ languages
- ✅ Copy-paste ready snippets
- ✅ Common use cases
- ✅ API reference

### Step 3: Copy Code & Use!

Choose your language, copy the code, and start using PyKV!

---

## 📱 Integration Methods

### Method 1: Direct HTTP Requests (Simplest)

**Any language that can make HTTP requests can use PyKV!**

```python
# Python
import requests
requests.post('http://localhost:8000/set', json={'key': 'user:123', 'value': 'alice'})
```

```javascript
// JavaScript
fetch('http://localhost:8000/set', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({key: 'user:123', value: 'alice'})
});
```

```bash
# cURL
curl -X POST http://localhost:8000/set \
  -H "Content-Type: application/json" \
  -d '{"key":"user:123","value":"alice"}'
```

### Method 2: Use Client Libraries

We provide ready-to-use client libraries:

**Python:** Copy `client_examples/python_client.py`
```python
from python_client import PyKVClient
client = PyKVClient('http://localhost:8000')
client.set('user:123', 'alice', ttl=3600, namespace='myapp')
```

**Node.js:** Copy `client_examples/nodejs_client.js`
```javascript
const PyKVClient = require('./nodejs_client');
const client = new PyKVClient('http://localhost:8000');
await client.set('user:123', 'alice', {ttl: 3600, namespace: 'myapp'});
```

---

## 💡 Real-World Examples

### Example 1: Flask Session Storage

```python
from flask import Flask, session
import requests

app = Flask(__name__)
PYKV_URL = "http://localhost:8000"

@app.route('/login', methods=['POST'])
def login():
    username = request.json['username']
    session_id = generate_session_id()
    
    # Store session in PyKV (expires in 1 hour)
    requests.post(f'{PYKV_URL}/set?ns=sessions', json={
        'key': f'session:{session_id}',
        'value': username,
        'ttl': 3600
    })
    
    return {'session_id': session_id}

@app.route('/profile')
def profile():
    session_id = request.headers.get('Session-ID')
    
    # Get session from PyKV
    response = requests.get(f'{PYKV_URL}/get/session:{session_id}?ns=sessions')
    
    if response.status_code == 404:
        return {'error': 'Session expired'}, 401
    
    username = response.json()['value']
    return {'username': username}
```

### Example 2: Express.js API Caching

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
const PYKV_URL = 'http://localhost:8000';

app.get('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    const cacheKey = `user:${userId}`;
    
    // Try cache first
    try {
        const cached = await axios.get(`${PYKV_URL}/get/${cacheKey}?ns=cache`);
        return res.json(JSON.parse(cached.data.value));
    } catch (error) {
        if (error.response?.status !== 404) throw error;
    }
    
    // Fetch from database
    const user = await db.users.findById(userId);
    
    // Cache for 5 minutes
    await axios.post(`${PYKV_URL}/set?ns=cache`, {
        key: cacheKey,
        value: JSON.stringify(user),
        ttl: 300
    });
    
    res.json(user);
});

app.listen(3000);
```

### Example 3: Django Rate Limiting

```python
# middleware.py
import requests
from django.http import JsonResponse

PYKV_URL = "http://localhost:8000"

class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        ip = request.META.get('REMOTE_ADDR')
        key = f'ratelimit:{ip}'
        
        # Get current count
        try:
            response = requests.get(f'{PYKV_URL}/get/{key}?ns=ratelimit')
            count = int(response.json()['value'])
            
            if count >= 100:
                return JsonResponse({'error': 'Rate limit exceeded'}, status=429)
            
            # Increment
            requests.post(f'{PYKV_URL}/set?ns=ratelimit', json={
                'key': key,
                'value': str(count + 1),
                'ttl': 60  # Reset every minute
            })
        except:
            # First request
            requests.post(f'{PYKV_URL}/set?ns=ratelimit', json={
                'key': key,
                'value': '1',
                'ttl': 60
            })
        
        return self.get_response(request)
```

### Example 4: React Frontend Caching

```javascript
// services/cache.js
const PYKV_URL = 'http://localhost:8000';

export async function getCached(key, fetchFunction, ttl = 300) {
    // Try cache
    try {
        const response = await fetch(`${PYKV_URL}/get/${key}?ns=cache`);
        if (response.ok) {
            const data = await response.json();
            return JSON.parse(data.value);
        }
    } catch (error) {
        console.log('Cache miss');
    }
    
    // Fetch fresh data
    const data = await fetchFunction();
    
    // Store in cache
    await fetch(`${PYKV_URL}/set?ns=cache`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            key,
            value: JSON.stringify(data),
            ttl
        })
    });
    
    return data;
}

// Usage in component
import { getCached } from './services/cache';

function UserProfile({ userId }) {
    const [user, setUser] = useState(null);
    
    useEffect(() => {
        getCached(
            `user:${userId}`,
            () => fetch(`/api/users/${userId}`).then(r => r.json()),
            300  // 5 minutes
        ).then(setUser);
    }, [userId]);
    
    return <div>{user?.name}</div>;
}
```

---

## 🏢 Multi-Tenant Usage

Use namespaces to isolate data:

```python
# Tenant A
requests.post('http://localhost:8000/set?ns=tenant_acme', json={
    'key': 'config:theme',
    'value': 'dark'
})

# Tenant B
requests.post('http://localhost:8000/set?ns=tenant_globex', json={
    'key': 'config:theme',
    'value': 'light'
})

# No conflicts! Each tenant has isolated data
```

---

## 🐳 Production Deployment

### Docker

```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app/
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t pykv .
docker run -p 8000:8000 pykv
```

### Docker Compose (with your app)

```yaml
version: '3.8'
services:
  pykv:
    image: pykv:latest
    ports:
      - "8000:8000"
    environment:
      - STORE_CAPACITY=10000
  
  myapp:
    image: myapp:latest
    depends_on:
      - pykv
    environment:
      - PYKV_URL=http://pykv:8000
```

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/set?ns=namespace` | Store key-value |
| GET | `/get/{key}?ns=namespace` | Retrieve value |
| DELETE | `/delete/{key}?ns=namespace` | Delete key |
| GET | `/namespaces` | List namespaces |
| GET | `/stats?ns=namespace` | Get statistics |
| GET | `/health` | Health check |

**Full API Docs:** `http://localhost:8000/docs`

---

## 🎓 Learning Resources

1. **Web UI Integration Tab** - Open `ui/index.html` → Click "Integration"
   - Code examples in 6+ languages
   - Copy-paste ready
   - Interactive examples

2. **Documentation Files**
   - `INTEGRATION_GUIDE.md` - Detailed integration guide
   - `QUICK_START.md` - 5-minute quick start
   - `NAMESPACES.md` - Multi-tenant guide

3. **Example Files**
   - `client_examples/python_client.py` - Python client library
   - `client_examples/nodejs_client.js` - Node.js client library
   - `examples/namespace_demo.py` - Namespace examples

---

## ✅ Checklist for Integration

- [ ] PyKV server is running (`python start_pykv.py`)
- [ ] Server is accessible at `http://localhost:8000`
- [ ] Health check works: `curl http://localhost:8000/health`
- [ ] Choose integration method (HTTP or client library)
- [ ] Copy code examples from Web UI Integration tab
- [ ] Test with a simple SET/GET operation
- [ ] Use namespaces for data isolation
- [ ] Set TTL for temporary data
- [ ] Monitor with `/stats` endpoint

---

## 🆘 Common Issues

### Can't connect to PyKV
```bash
# Check if server is running
curl http://localhost:8000/health

# Check if port is in use
netstat -an | grep 8000
```

### CORS errors in browser
PyKV has CORS enabled by default. If you still get errors:
```python
# In app/main.py, CORS is already configured:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Already set
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Key not found (404)
This is normal! It means the key doesn't exist or has expired.
```python
response = requests.get(f'{PYKV_URL}/get/mykey')
if response.status_code == 404:
    print("Key not found or expired")
```

---

## 🎉 You're Ready!

**3 Ways to Get Started:**

1. **Easiest:** Open `ui/index.html` → Click "Integration" tab → Copy code
2. **Quick:** Use `client_examples/python_client.py` or `nodejs_client.js`
3. **Custom:** Make HTTP requests directly from your app

**Need Help?**
- Check Web UI Integration tab for examples
- Read `INTEGRATION_GUIDE.md` for detailed docs
- Run `examples/namespace_demo.py` for live examples

**Start building with PyKV now! 🚀**
