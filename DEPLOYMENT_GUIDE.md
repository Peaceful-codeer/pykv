# PyKV Deployment Guide

## 🌐 How People Use Your Deployed PyKV

When you deploy PyKV, it becomes a **backend service** that other applications connect to via HTTP/REST API.

---

## 📊 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET / CLOUD                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Website    │    │  Mobile App  │    │  Backend API │
│ (Frontend)   │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              │ HTTP Requests
                              ▼
                    ┌──────────────────┐
                    │   PyKV Server    │
                    │  (Your Deploy)   │
                    │ pykv.example.com │
                    └──────────────────┘
```

---

## 🚀 Deployment Options

### Option 1: Cloud Hosting (Recommended)

#### A. Deploy on Heroku

**Step 1: Create Procfile**
```bash
# Procfile
web: python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Step 2: Deploy**
```bash
# Login to Heroku
heroku login

# Create app
heroku create my-pykv-server

# Deploy
git push heroku main

# Your PyKV is now at: https://my-pykv-server.herokuapp.com
```

**Step 3: Users Connect**
```python
# Users change localhost to your Heroku URL
PYKV_URL = "https://my-pykv-server.herokuapp.com"

response = requests.post(f"{PYKV_URL}/set", json={
    "key": "user:123",
    "value": "alice"
})
```

#### B. Deploy on AWS EC2

**Step 1: Launch EC2 Instance**
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install dependencies
sudo apt update
sudo apt install python3-pip
pip3 install -r requirements.txt

# Run PyKV
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Step 2: Configure Security Group**
- Open port 8000 in AWS Security Group
- Or use Nginx reverse proxy on port 80/443

**Step 3: Users Connect**
```python
# Users use your EC2 public IP or domain
PYKV_URL = "http://your-ec2-ip:8000"
# Or with domain: "https://pykv.yourdomain.com"

response = requests.post(f"{PYKV_URL}/set", json={
    "key": "user:123",
    "value": "alice"
})
```

#### C. Deploy on DigitalOcean

**Step 1: Create Droplet**
```bash
# SSH into droplet
ssh root@your-droplet-ip

# Install Python and dependencies
apt update
apt install python3-pip
pip3 install -r requirements.txt

# Run PyKV with systemd (persistent)
nano /etc/systemd/system/pykv.service
```

**systemd service file:**
```ini
[Unit]
Description=PyKV Server
After=network.target

[Service]
User=root
WorkingDirectory=/root/pykv
ExecStart=/usr/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
systemctl enable pykv
systemctl start pykv
```

**Step 2: Users Connect**
```python
PYKV_URL = "http://your-droplet-ip:8000"
```

#### D. Deploy with Docker

**Step 1: Build Docker Image**
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
RUN mkdir -p data

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build
docker build -t pykv-server .

# Run
docker run -d -p 8000:8000 --name pykv pykv-server

# Or push to Docker Hub
docker tag pykv-server yourusername/pykv-server
docker push yourusername/pykv-server
```

**Step 2: Users Pull and Use**
```bash
# Users can run your Docker image
docker run -d -p 8000:8000 yourusername/pykv-server
```

---

## 🌍 How Users Connect from Different Platforms

### 1. From a Website (Frontend Only)

**Scenario:** User has a static website (HTML/CSS/JS) with no backend.

**Solution:** They connect directly from JavaScript

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <h1>My Website Using PyKV</h1>
    <button onclick="saveData()">Save Data</button>
    <button onclick="loadData()">Load Data</button>
    <div id="result"></div>

    <script>
        // Change this to YOUR deployed PyKV URL
        const PYKV_URL = "https://your-pykv-server.herokuapp.com";

        async function saveData() {
            const response = await fetch(`${PYKV_URL}/set?ns=mywebsite`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    key: 'user:data',
                    value: 'Hello from my website!',
                    ttl: 3600
                })
            });
            const data = await response.json();
            document.getElementById('result').textContent = 'Saved: ' + JSON.stringify(data);
        }

        async function loadData() {
            const response = await fetch(`${PYKV_URL}/get/user:data?ns=mywebsite`);
            if (response.ok) {
                const data = await response.json();
                document.getElementById('result').textContent = 'Loaded: ' + data.value;
            } else {
                document.getElementById('result').textContent = 'No data found';
            }
        }
    </script>
</body>
</html>
```

**Important:** Enable CORS (already enabled in PyKV by default)

### 2. From a React/Vue/Angular App

```javascript
// config.js
export const PYKV_URL = "https://your-pykv-server.herokuapp.com";

// App.js
import { PYKV_URL } from './config';

function App() {
    const saveData = async () => {
        await fetch(`${PYKV_URL}/set?ns=myapp`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                key: 'user:123',
                value: 'alice',
                ttl: 3600
            })
        });
    };

    const loadData = async () => {
        const response = await fetch(`${PYKV_URL}/get/user:123?ns=myapp`);
        const data = await response.json();
        console.log(data.value);
    };

    return (
        <div>
            <button onClick={saveData}>Save</button>
            <button onClick={loadData}>Load</button>
        </div>
    );
}
```

### 3. From a Backend API (Python/Node.js/PHP)

**Python (Flask/Django/FastAPI):**
```python
# config.py
PYKV_URL = "https://your-pykv-server.herokuapp.com"

# app.py
import requests
from config import PYKV_URL

@app.route('/api/save')
def save_data():
    response = requests.post(f"{PYKV_URL}/set?ns=mybackend", json={
        "key": "user:123",
        "value": "alice",
        "ttl": 3600
    })
    return response.json()

@app.route('/api/load')
def load_data():
    response = requests.get(f"{PYKV_URL}/get/user:123?ns=mybackend")
    return response.json()
```

**Node.js (Express):**
```javascript
// config.js
const PYKV_URL = "https://your-pykv-server.herokuapp.com";

// app.js
const axios = require('axios');

app.get('/api/save', async (req, res) => {
    const response = await axios.post(`${PYKV_URL}/set?ns=mybackend`, {
        key: 'user:123',
        value: 'alice',
        ttl: 3600
    });
    res.json(response.data);
});

app.get('/api/load', async (req, res) => {
    const response = await axios.get(`${PYKV_URL}/get/user:123?ns=mybackend`);
    res.json(response.data);
});
```

### 4. From Mobile Apps

**React Native:**
```javascript
const PYKV_URL = "https://your-pykv-server.herokuapp.com";

const saveData = async () => {
    const response = await fetch(`${PYKV_URL}/set?ns=mobileapp`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            key: 'user:123',
            value: 'alice',
            ttl: 3600
        })
    });
    return response.json();
};
```

**Flutter:**
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

final PYKV_URL = "https://your-pykv-server.herokuapp.com";

Future<void> saveData() async {
  final response = await http.post(
    Uri.parse('$PYKV_URL/set?ns=mobileapp'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'key': 'user:123',
      'value': 'alice',
      'ttl': 3600
    })
  );
  print(response.body);
}
```

---

## 🔒 Security Considerations

### 1. Use HTTPS (SSL/TLS)

**With Nginx Reverse Proxy:**
```nginx
# /etc/nginx/sites-available/pykv
server {
    listen 80;
    server_name pykv.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Get Free SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d pykv.yourdomain.com
```

Now users connect via HTTPS:
```python
PYKV_URL = "https://pykv.yourdomain.com"
```

### 2. Add API Key Authentication (Optional)

**Modify app/main.py:**
```python
from fastapi import Header, HTTPException

API_KEY = "your-secret-api-key"

async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

@app.post("/set", dependencies=[Depends(verify_api_key)])
async def set_key(data: SetRequest):
    # ... existing code
```

**Users include API key:**
```python
headers = {"X-API-Key": "your-secret-api-key"}
response = requests.post(f"{PYKV_URL}/set", json=data, headers=headers)
```

### 3. Rate Limiting

**Install slowapi:**
```bash
pip install slowapi
```

**Add to app/main.py:**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

@app.post("/set")
@limiter.limit("100/minute")
async def set_key(request: Request, data: SetRequest):
    # ... existing code
```

---

## 📝 Provide to Users

### Create a README for Users

**YOUR_PYKV_README.md:**
```markdown
# Using My PyKV Server

## Server URL
https://your-pykv-server.herokuapp.com

## Quick Start

### JavaScript (Website)
```javascript
const PYKV_URL = "https://your-pykv-server.herokuapp.com";

// Save data
await fetch(`${PYKV_URL}/set?ns=myapp`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({key: 'user:123', value: 'alice', ttl: 3600})
});

// Load data
const response = await fetch(`${PYKV_URL}/get/user:123?ns=myapp`);
const data = await response.json();
console.log(data.value);
```

### Python (Backend)
```python
import requests

PYKV_URL = "https://your-pykv-server.herokuapp.com"

# Save data
requests.post(f"{PYKV_URL}/set?ns=myapp", json={
    "key": "user:123",
    "value": "alice",
    "ttl": 3600
})

# Load data
response = requests.get(f"{PYKV_URL}/get/user:123?ns=myapp")
print(response.json()["value"])
```

## API Documentation
https://your-pykv-server.herokuapp.com/docs

## Support
Contact: your-email@example.com
```

---

## 🎯 Complete Example: Deploy and Share

### Step 1: Deploy to Heroku
```bash
heroku create my-pykv-service
git push heroku main
# URL: https://my-pykv-service.herokuapp.com
```

### Step 2: Test It Works
```bash
curl https://my-pykv-service.herokuapp.com/health
```

### Step 3: Share with Users

**Send them:**
1. **Server URL:** `https://my-pykv-service.herokuapp.com`
2. **API Docs:** `https://my-pykv-service.herokuapp.com/docs`
3. **Code Example:**

```javascript
// For websites - just change the URL!
const PYKV_URL = "https://my-pykv-service.herokuapp.com";

// Save data
fetch(`${PYKV_URL}/set?ns=mywebsite`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        key: 'user:data',
        value: 'Hello World',
        ttl: 3600
    })
});

// Load data
fetch(`${PYKV_URL}/get/user:data?ns=mywebsite`)
    .then(r => r.json())
    .then(data => console.log(data.value));
```

---

## 💡 Summary

**For Users with Only a Website (No Backend):**

1. You deploy PyKV to cloud (Heroku/AWS/DigitalOcean)
2. You get a URL: `https://your-pykv.herokuapp.com`
3. Users connect from their website JavaScript:

```javascript
const PYKV_URL = "https://your-pykv.herokuapp.com";

// They can now use PyKV directly from their website!
fetch(`${PYKV_URL}/set`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({key: 'data', value: 'value'})
});
```

**Key Point:** PyKV IS the backend! Users don't need their own backend - they connect directly to your deployed PyKV server via HTTP requests.

---

## 🚀 Next Steps

1. Choose deployment platform (Heroku/AWS/DigitalOcean)
2. Deploy PyKV
3. Get your server URL
4. Share URL and code examples with users
5. Users connect from their websites/apps
6. Done! 🎉


---

## 🔧 Troubleshooting Deployment Issues

### Issue 1: Pydantic/Rust Build Errors on Render

**Error Message:**
```
error: failed to create directory `/usr/local/cargo/registry/cache/...`
Caused by: Read-only file system (os error 30)
💥 maturin failed
```

**Solution:**
This happens when pydantic-core tries to compile from source. Use pre-built wheels:

1. Ensure you have `runtime.txt` with:
   ```
   python-3.11.7
   ```

2. Update `render.yaml` build command:
   ```yaml
   buildCommand: pip install --upgrade pip && pip install -r requirements.txt
   ```

3. Use compatible package versions in `requirements.txt`:
   ```
   fastapi==0.109.0
   uvicorn[standard]==0.27.0
   pydantic==2.6.0
   ```

### Issue 2: Port Binding Errors

**Error:** `Address already in use`

**Solution:**
Ensure your app uses the `$PORT` environment variable:
```python
# In your start command
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Issue 3: CORS Errors from Frontend

**Error:** `Access-Control-Allow-Origin` blocked

**Solution:**
PyKV has CORS enabled by default. If issues persist, check your deployment URL is correct and using HTTPS.

### Issue 4: Health Check Failing

**Error:** Service keeps restarting

**Solution:**
1. Verify `/health` endpoint works locally
2. Check logs: `render logs` or platform-specific command
3. Ensure dependencies installed correctly

### Issue 5: Out of Memory

**Error:** `MemoryError` or service crashes

**Solution:**
1. Reduce `STORE_CAPACITY` in environment variables
2. Upgrade to paid tier with more RAM
3. Implement regular compaction

### Getting Help

1. Check deployment logs on your platform
2. Test locally first: `python -m uvicorn app.main:app`
3. Verify all files committed to git
4. Check platform status page for outages

**Platform-Specific Logs:**
- Render: Dashboard → Logs tab
- Heroku: `heroku logs --tail`
- Railway: Dashboard → Deployments → Logs
- Fly.io: `fly logs`
