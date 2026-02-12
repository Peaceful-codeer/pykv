# PyKV Deployment Troubleshooting Guide

## 🚨 Quick Fix for Render Build Errors

If you're seeing this error:
```
error: failed to create directory `/usr/local/cargo/registry/cache/...`
💥 maturin failed
Caused by: Cargo metadata failed
```

### ✅ Solution A: Use Docker (Recommended - Most Reliable)

1. **Rename the Docker config:**
   ```bash
   mv render.yaml render-python.yaml.backup
   mv render-docker.yaml render.yaml
   ```

2. **Commit and push:**
   ```bash
   git add render.yaml Dockerfile .dockerignore
   git commit -m "Fix: Use Docker for deployment"
   git push
   ```

Render will automatically redeploy using Docker, which has pre-built wheels!

### ✅ Solution B: Use Compatible Python Versions

1. **Create `runtime.txt` in your project root:**
   ```
   python-3.11.6
   ```

2. **Update `requirements.txt` to use older stable versions:**
   ```
   fastapi==0.104.1
   uvicorn[standard]==0.24.0
   pydantic==2.4.2
   aiofiles==23.2.1
   aiohttp==3.9.1
   python-multipart==0.0.6
   ```

3. **Update `render.yaml` build command:**
   ```yaml
   buildCommand: |
     pip install --upgrade pip
     pip install --only-binary=:all: -r requirements.txt || pip install -r requirements.txt
   ```

4. **Commit and push:**
   ```bash
   git add runtime.txt requirements.txt render.yaml
   git commit -m "Fix: Use pre-built wheels for pydantic"
   git push
   ```

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] `requirements.txt` with compatible versions
- [ ] `runtime.txt` specifying Python version
- [ ] `render.yaml` (for Render) or `Procfile` (for Heroku)
- [ ] All files committed to git
- [ ] Tested locally: `python -m uvicorn app.main:app`
- [ ] Health endpoint works: `curl http://localhost:8000/health`

---

## 🔍 Common Issues & Solutions

### Issue 1: Build Fails with Rust/Cargo Errors

**Platforms:** Render, Railway, Fly.io

**Cause:** pydantic-core trying to compile from source

**Solution:** Use pre-built wheels (see Quick Fix above)

---

### Issue 2: Service Starts but Shows Unhealthy

**Symptoms:**
- Build succeeds
- Service shows as "unhealthy" or keeps restarting
- Health checks fail

**Solutions:**

1. **Check port binding:**
   ```yaml
   # Ensure using $PORT variable
   startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

2. **Verify health endpoint:**
   ```bash
   # Test locally first
   curl http://localhost:8000/health
   ```

3. **Check logs:**
   - Render: Dashboard → Logs
   - Railway: Deployments → Logs
   - Heroku: `heroku logs --tail`

---

### Issue 3: Out of Memory / Service Crashes

**Symptoms:**
- Service crashes randomly
- "MemoryError" in logs
- Frequent restarts

**Solutions:**

1. **Reduce memory usage:**
   ```yaml
   # In render.yaml or environment variables
   envVars:
     - key: STORE_CAPACITY
       value: 500  # Reduce from 1000
   ```

2. **Enable more frequent compaction:**
   ```yaml
   envVars:
     - key: COMPACTION_INTERVAL
       value: 180  # Compact every 3 minutes
   ```

3. **Upgrade to paid tier** (if needed)

---

### Issue 4: CORS Errors from Frontend

**Symptoms:**
- Browser console shows CORS errors
- `Access-Control-Allow-Origin` blocked
- Frontend can't connect

**Solutions:**

1. **Verify URL is correct:**
   ```javascript
   // Use HTTPS, not HTTP
   const PYKV_URL = "https://your-app.onrender.com";  // ✅
   const PYKV_URL = "http://your-app.onrender.com";   // ❌
   ```

2. **Check deployment URL:**
   - No trailing slash
   - Correct domain
   - Service is running

3. **CORS is enabled by default** in PyKV, no changes needed

---

### Issue 5: Slow First Request (Cold Start)

**Symptoms:**
- First request takes 30-60 seconds
- Subsequent requests are fast
- Happens after inactivity

**Cause:** Free tier services "sleep" after 15 minutes of inactivity

**Solutions:**

1. **Accept it** (it's free!)
2. **Use a ping service:**
   - [UptimeRobot](https://uptimerobot.com) (free)
   - Ping your `/health` endpoint every 14 minutes
3. **Upgrade to paid tier** (no sleep)
4. **Switch to Railway** ($5 credit, no auto-sleep)

---

### Issue 6: Build Timeout

**Symptoms:**
- Build exceeds time limit
- "Build failed: timeout" error

**Solutions:**

1. **Optimize build command:**
   ```yaml
   buildCommand: pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt
   ```

2. **Remove unnecessary dependencies** from requirements.txt

3. **Use lighter Python version:** 3.11 instead of 3.12

---

## 🛠️ Debugging Steps

### Step 1: Test Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Test health endpoint
curl http://localhost:8000/health

# Test SET operation
curl -X POST http://localhost:8000/set \
  -H "Content-Type: application/json" \
  -d '{"key":"test","value":"works"}'

# Test GET operation
curl http://localhost:8000/get/test
```

If it works locally but not on deployment, it's a deployment configuration issue.

---

### Step 2: Check Deployment Logs

**Render:**
```
Dashboard → Your Service → Logs tab
```

**Railway:**
```
Dashboard → Deployments → Click deployment → Logs
```

**Heroku:**
```bash
heroku logs --tail --app your-app-name
```

**Fly.io:**
```bash
fly logs
```

Look for:
- Import errors
- Port binding errors
- Memory errors
- Dependency installation failures

---

### Step 3: Verify Environment Variables

Ensure these are set (if using custom values):

```yaml
STORE_CAPACITY=1000
COMPACTION_INTERVAL=300
CLEANUP_INTERVAL=60
```

---

### Step 4: Check Platform Status

Sometimes the platform itself has issues:

- [Render Status](https://status.render.com)
- [Railway Status](https://status.railway.app)
- [Heroku Status](https://status.heroku.com)
- [Fly.io Status](https://status.flyio.net)

---

## 📞 Getting Help

### 1. Check Documentation
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [FREE_DEPLOYMENT_OPTIONS.md](./FREE_DEPLOYMENT_OPTIONS.md)

### 2. Platform Support
- Render: [Community Forum](https://community.render.com)
- Railway: [Discord](https://discord.gg/railway)
- Heroku: [Dev Center](https://devcenter.heroku.com)

### 3. Common Solutions
- 90% of issues: Use `runtime.txt` and compatible package versions
- 5% of issues: Port configuration
- 5% of issues: Memory limits on free tier

---

## ✅ Success Checklist

Your deployment is successful when:

- [ ] Build completes without errors
- [ ] Service shows as "Live" or "Running"
- [ ] Health check passes: `curl https://your-app.onrender.com/health`
- [ ] Can SET a key: `curl -X POST https://your-app.onrender.com/set -H "Content-Type: application/json" -d '{"key":"test","value":"works"}'`
- [ ] Can GET the key: `curl https://your-app.onrender.com/get/test`
- [ ] Web UI loads: `https://your-app.onrender.com/ui/index.html`

---

## 🎉 After Successful Deployment

1. **Test all endpoints** using the web UI
2. **Share the URL** with your users
3. **Monitor usage** via platform dashboard
4. **Set up uptime monitoring** (optional)
5. **Consider upgrading** if you need more resources

Your PyKV is now live and ready to use! 🚀
