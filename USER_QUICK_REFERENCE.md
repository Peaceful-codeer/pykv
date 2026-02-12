# PyKV User Quick Reference

## 🌐 Server URL
```
http://localhost:8000  (Local development)
https://your-pykv-server.herokuapp.com  (Production)
```

---

## 📱 For Website Users (No Backend Needed!)

### Copy-Paste This Code Into Your Website

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website with PyKV</title>
</head>
<body>
    <h1>My Website</h1>
    <button onclick="saveData()">Save Data</button>
    <button onclick="loadData()">Load Data</button>
    <div id="result"></div>

    <script>
        // 👇 CHANGE THIS TO YOUR PYKV SERVER URL
        const PYKV_URL = "http://localhost:8000";
        // For production: "https://your-pykv-server.herokuapp.com"

        // Save data
        async function saveData() {
            const response = await fetch(`${PYKV_URL}/set?ns=mywebsite`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    key: 'user:data',
                    value: 'Hello World!',
                    ttl: 3600  // Expires in 1 hour
                })
            });
            const data = await response.json();
            document.getElementById('result').textContent = 'Saved: ' + JSON.stringify(data);
        }

        // Load data
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

**That's it!** Your website can now save and load data without a backend!

---

## 🔧 API Quick Reference

### Save Data (SET)
```javascript
fetch('http://localhost:8000/set?ns=myapp', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        key: 'user:123',
        value: 'alice',
        ttl: 3600  // Optional: expires in 1 hour
    })
});
```

### Load Data (GET)
```javascript
const response = await fetch('http://localhost:8000/get/user:123?ns=myapp');
const data = await response.json();
console.log(data.value);  // alice
```

### Delete Data (DELETE)
```javascript
fetch('http://localhost:8000/delete/user:123?ns=myapp', {
    method: 'DELETE'
});
```

### Get Statistics
```javascript
const response = await fetch('http://localhost:8000/stats');
const stats = await response.json();
console.log(stats.total_keys);
```

---

## 🎯 Common Use Cases

### 1. Save User Preferences
```javascript
// Save theme preference
await fetch(`${PYKV_URL}/set?ns=mywebsite`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        key: 'user:theme',
        value: 'dark'
    })
});

// Load theme preference
const response = await fetch(`${PYKV_URL}/get/user:theme?ns=mywebsite`);
const data = await response.json();
document.body.className = data.value;  // 'dark'
```

### 2. Shopping Cart
```javascript
// Add item to cart
const cart = ['item1', 'item2', 'item3'];
await fetch(`${PYKV_URL}/set?ns=mywebsite`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        key: 'cart:user123',
        value: JSON.stringify(cart),
        ttl: 86400  // 24 hours
    })
});

// Load cart
const response = await fetch(`${PYKV_URL}/get/cart:user123?ns=mywebsite`);
const data = await response.json();
const cart = JSON.parse(data.value);
```

### 3. Form Data (Auto-save)
```javascript
// Auto-save form every 5 seconds
setInterval(async () => {
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value
    };
    
    await fetch(`${PYKV_URL}/set?ns=mywebsite`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            key: 'form:draft',
            value: JSON.stringify(formData),
            ttl: 3600
        })
    });
}, 5000);

// Restore form on page load
window.addEventListener('load', async () => {
    const response = await fetch(`${PYKV_URL}/get/form:draft?ns=mywebsite`);
    if (response.ok) {
        const data = await response.json();
        const formData = JSON.parse(data.value);
        document.getElementById('name').value = formData.name;
        document.getElementById('email').value = formData.email;
    }
});
```

### 4. Page View Counter
```javascript
// Increment page views
async function incrementViews() {
    // Get current count
    let count = 0;
    const response = await fetch(`${PYKV_URL}/get/page:views?ns=mywebsite`);
    if (response.ok) {
        const data = await response.json();
        count = parseInt(data.value);
    }
    
    // Increment and save
    await fetch(`${PYKV_URL}/set?ns=mywebsite`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            key: 'page:views',
            value: String(count + 1)
        })
    });
    
    document.getElementById('views').textContent = count + 1;
}

incrementViews();
```

---

## 🔐 Important Notes

### Namespaces
Always use `?ns=yourappname` to isolate your data:
```javascript
// Good - isolated data
fetch(`${PYKV_URL}/set?ns=mywebsite`, ...)

// Bad - shared with everyone
fetch(`${PYKV_URL}/set`, ...)
```

### TTL (Time To Live)
Set expiration time in seconds:
```javascript
ttl: 60      // 1 minute
ttl: 3600    // 1 hour
ttl: 86400   // 1 day
ttl: 604800  // 1 week
```

### Error Handling
Always check response status:
```javascript
const response = await fetch(`${PYKV_URL}/get/mykey?ns=myapp`);
if (response.ok) {
    const data = await response.json();
    console.log(data.value);
} else if (response.status === 404) {
    console.log('Key not found or expired');
} else {
    console.log('Error:', response.status);
}
```

---

## 📚 More Examples

### Complete Working Example
See: `examples/simple_website_example.html`

Just open it in your browser and it works!

### API Documentation
Visit: `http://localhost:8000/docs`

Interactive API documentation with try-it-out feature.

---

## 🆘 Troubleshooting

### "Failed to fetch" Error
**Problem:** Cannot connect to PyKV server

**Solutions:**
1. Make sure PyKV server is running: `python start_pykv.py`
2. Check the server URL is correct
3. Check CORS is enabled (it is by default)

### "404 Not Found" Error
**Problem:** Key doesn't exist

**Solutions:**
1. The key was never saved
2. The key expired (TTL reached)
3. The key was deleted
4. Wrong namespace

### Data Not Persisting
**Problem:** Data disappears after server restart

**Solution:** PyKV saves data to `data/wal.log` automatically. Make sure this file exists and has write permissions.

---

## 🎉 You're Ready!

1. ✅ Copy the code above
2. ✅ Change `PYKV_URL` to your server
3. ✅ Use `?ns=yourappname` for isolation
4. ✅ Set `ttl` for auto-expiration
5. ✅ Start building!

**Need more help?** Check `DEPLOYMENT_GUIDE.md` for deployment instructions.
