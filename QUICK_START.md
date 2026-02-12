# PyKV Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Start PyKV Server

```bash
# Clone or download PyKV
cd pykv

# Install dependencies
pip install -r requirements.txt

# Start server
python start_pykv.py
```

Server will be running at `http://localhost:8000`

---

### Step 2: Choose Your Integration Method

## Option A: Direct HTTP Requests (Any Language)

### Python
```python
import requests

# SET
requests.post('http://localhost:8000/set', json={
    'key': 'user:123',
    'value': 'alice',
    'ttl': 3600
})

# GET
response = requests.get('http://localhost:8000/get/user:123')
print(response.json()['value'])  # alice

# DELETE
requests.delete('http://localhost:8000/delete/user:123')
```

### JavaScript/Node.js
```javascript
const axios = require('axios');

// SET
await axios.post('http://localhost:8000/set', {
    key: 'user:123',
    value: 'alice',
    ttl: 3600
});

// GET
const response = await axios.get('http://localhost:8000/get/user:123');
console.log(response.data.value);  // alice

// DELETE
await axios.delete('http://localhost:8000/delete/user:123');
```

### cURL
```bash
# SET
curl -X POST http://localhost:8000/set \
  -H "Content-Type: application/json" \
  -d '{"key":"user:123","value":"alice","ttl":3600}'

# GET
curl http://localhost:8000/get/user:123

# DELETE
curl -X DELETE http://localhost:8000/delete/user:123
```

---

## Option B: Use Ready-Made Client Libraries

### Python Client

Copy `client_examples/python_client.py` to your project:

```python
from python_client import PyKVClient

# Initialize
client = PyKVClient('http://localhost:8000')

# Use it!
client.set('user:123', 'alice', ttl=3600, namespace='myapp')
value = client.get('user:123', namespace='myapp')
client.delete('user:123', namespace='myapp')
```

### Node.js Client

Copy `client_examples/nodejs_client.js` to your project:

```javascript
const PyKVClient = require('./nodejs_client');

// Initialize
const client = new PyKVClient('http://localhost:8000');

// Use it!
await client.set('user:123', 'alice', { ttl: 3600, namespace: 'myapp' });
const value = await client.get('user:123', 'myapp');
await client.delete('user:123', 'myapp');
```

---

## 🎯 Common Use Cases

### 1. Session Storage

```python
# Store user session
client.set(
    f'session:{session_id}',
    user_data,
    ttl=3600,  # 1 hour
    namespace='sessions'
)

# Check session
session_data = client.get(f'session:{session_id}', namespace='sessions')
if not session_data:
    return "Session expired"
```

### 2. API Response Caching

```python
def get_user(user_id):
    cache_key = f'user:{user_id}'
    
    # Try cache first
    cached = client.get(cache_key, namespace='cache')
    if cached:
        return json.loads(cached)
    
    # Fetch from database
    user = db.query(User).get(user_id)
    
    # Cache for 5 minutes
    client.set(cache_key, json.dumps(user), ttl=300, namespace='cache')
    
    return user
```

### 3. Rate Limiting

```python
def check_rate_limit(user_id):
    key = f'ratelimit:{user_id}'
    
    # Get current count
    count = client.get(key, namespace='ratelimit')
    count = int(count) if count else 0
    
    if count >= 100:
        return False  # Rate limit exceeded
    
    # Increment count
    client.set(key, str(count + 1), ttl=60, namespace='ratelimit')
    return True
```

### 4. Multi-Tenant Data

```python
# Tenant A
client.set('config:theme', 'dark', namespace='tenant_acme')

# Tenant B
client.set('config:theme', 'light', namespace='tenant_globex')

# Complete isolation - no conflicts!
```

---

## 🌐 Web UI

Open `ui/index.html` in your browser for a visual interface:

- Execute operations with forms
- View real-time statistics
- Manage namespaces
- Use Redis-like CLI terminal

---

## 📊 API Endpoints Reference

### Core Operations
- `POST /set?ns=namespace` - Store key-value
- `GET /get/{key}?ns=namespace` - Retrieve value
- `DELETE /delete/{key}?ns=namespace` - Delete key

### Namespace Management
- `GET /namespaces` - List all namespaces
- `GET /namespaces/{ns}/keys` - Get namespace size
- `DELETE /namespaces/{ns}` - Clear namespace

### Monitoring
- `GET /stats?ns=namespace` - Get statistics
- `GET /health` - Health check
- `GET /performance` - Performance metrics

Full API docs: `http://localhost:8000/docs`

---

## 🐳 Docker Deployment

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
# Build and run
docker build -t pykv .
docker run -p 8000:8000 pykv
```

---

## 🔧 Configuration

Edit `app/config.py`:

```python
STORE_CAPACITY = 100           # Max keys in cache
LOG_FILE = "data/wal.log"      # WAL file path
COMPACTION_INTERVAL = 300      # 5 minutes
CLEANUP_INTERVAL = 60          # 1 minute
```

---

## 💡 Tips

1. **Use Namespaces**: Isolate data by app, environment, or tenant
2. **Set TTL**: Auto-expire temporary data
3. **Monitor Stats**: Check `/stats` for performance insights
4. **Connection Pooling**: Reuse HTTP connections for better performance
5. **Error Handling**: Always handle 404 responses for missing keys

---

## 📚 More Resources

- **Full Integration Guide**: See `INTEGRATION_GUIDE.md`
- **Namespace Guide**: See `NAMESPACES.md`
- **Examples**: Check `examples/namespace_demo.py`
- **Client Libraries**: See `client_examples/` folder

---

## 🆘 Troubleshooting

### Server won't start
```bash
# Check if port 8000 is in use
netstat -an | grep 8000

# Try different port
python -m uvicorn app.main:app --port 8001
```

### Connection refused
```bash
# Check server is running
curl http://localhost:8000/health

# Check firewall settings
```

### Import errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

---

## 🎉 You're Ready!

Start using PyKV in your application:

1. ✅ Server running at `http://localhost:8000`
2. ✅ Choose integration method (HTTP or client library)
3. ✅ Start storing and retrieving data
4. ✅ Use namespaces for isolation
5. ✅ Monitor with `/stats` endpoint

**Need help?** Check the full documentation or open an issue!
