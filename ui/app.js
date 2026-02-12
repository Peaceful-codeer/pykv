// Configuration
const API_URL = "http://127.0.0.1:8000";
let autoRefresh = true;
let refreshInterval;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    startAutoRefresh();
});

function initializeApp() {
    checkServerStatus();
    refreshStats();
    refreshNamespaces();
    loadNamespaceList();
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab(this.dataset.tab);
        });
    });

    // CLI input
    const cliInput = document.getElementById('cliInput');
    if (cliInput) {
        cliInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                executeCLI();
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 's':
                    e.preventDefault();
                    executeSet();
                    break;
                case 'g':
                    e.preventDefault();
                    executeGet();
                    break;
                case 'd':
                    e.preventDefault();
                    executeDelete();
                    break;
            }
        }
    });
}

function switchTab(tabName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Refresh data for specific tabs
    if (tabName === 'namespaces') {
        refreshNamespaces();
    } else if (tabName === 'monitor') {
        refreshStats();
        refreshPerformance();
    }
}

function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        if (autoRefresh) {
            checkServerStatus();
            const activeTab = document.querySelector('.tab-content.active').id;
            if (activeTab === 'monitor-tab') {
                refreshStats();
                refreshPerformance();
            }
        }
    }, 5000);
}

// Server Status
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();

        const indicator = document.getElementById('statusIndicator');
        if (response.ok) {
            indicator.classList.add('online');
            indicator.classList.remove('offline');
            indicator.querySelector('.status-text').textContent = 'Connected';
            document.getElementById('quickKeys').textContent = data.store_size || 0;
        } else {
            setOfflineStatus();
        }
    } catch (error) {
        setOfflineStatus();
    }
}

function setOfflineStatus() {
    const indicator = document.getElementById('statusIndicator');
    indicator.classList.add('offline');
    indicator.classList.remove('online');
    indicator.querySelector('.status-text').textContent = 'Disconnected';
}

// Operations
async function executeSet() {
    const namespace = document.getElementById('namespace').value.trim();
    const key = document.getElementById('key').value.trim();
    const value = document.getElementById('value').value.trim();
    const ttl = document.getElementById('ttl').value.trim();

    if (!key || !value) {
        showResult('Error: Key and value are required', 'error');
        return;
    }

    const payload = { key, value };
    if (ttl && parseInt(ttl) > 0) {
        payload.ttl = parseInt(ttl);
    }
    if (namespace) {
        payload.namespace = namespace;
    }

    try {
        const url = namespace ? `${API_URL}/set?ns=${encodeURIComponent(namespace)}` : `${API_URL}/set`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showResult(`SET ${namespace ? namespace + ':' : ''}${key}\n${JSON.stringify(data, null, 2)}`, 'success');
            refreshStats();
            loadNamespaceList();
        } else {
            showResult(`Error: ${JSON.stringify(data, null, 2)}`, 'error');
        }
    } catch (error) {
        showResult(`Network Error: ${error.message}`, 'error');
    }
}

async function executeGet() {
    const namespace = document.getElementById('namespace').value.trim();
    const key = document.getElementById('key').value.trim();

    if (!key) {
        showResult('Error: Key is required', 'error');
        return;
    }

    try {
        const url = namespace 
            ? `${API_URL}/get/${encodeURIComponent(key)}?ns=${encodeURIComponent(namespace)}`
            : `${API_URL}/get/${encodeURIComponent(key)}`;
        
        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();
            showResult(`GET ${namespace ? namespace + ':' : ''}${key}\n${JSON.stringify(data, null, 2)}`, 'success');
        } else if (response.status === 404) {
            showResult(`Key '${namespace ? namespace + ':' : ''}${key}' not found`, 'warning');
        } else {
            const error = await response.json();
            showResult(`Error: ${JSON.stringify(error, null, 2)}`, 'error');
        }
    } catch (error) {
        showResult(`Network Error: ${error.message}`, 'error');
    }
}

async function executeDelete() {
    const namespace = document.getElementById('namespace').value.trim();
    const key = document.getElementById('key').value.trim();

    if (!key) {
        showResult('Error: Key is required', 'error');
        return;
    }

    try {
        const url = namespace 
            ? `${API_URL}/delete/${encodeURIComponent(key)}?ns=${encodeURIComponent(namespace)}`
            : `${API_URL}/delete/${encodeURIComponent(key)}`;
        
        const response = await fetch(url, { method: 'DELETE' });

        if (response.ok) {
            const data = await response.json();
            showResult(`DELETE ${namespace ? namespace + ':' : ''}${key}\n${JSON.stringify(data, null, 2)}`, 'success');
            refreshStats();
        } else if (response.status === 404) {
            showResult(`Key '${namespace ? namespace + ':' : ''}${key}' not found`, 'warning');
        } else {
            const error = await response.json();
            showResult(`Error: ${JSON.stringify(error, null, 2)}`, 'error');
        }
    } catch (error) {
        showResult(`Network Error: ${error.message}`, 'error');
    }
}

function clearForm() {
    document.getElementById('namespace').value = '';
    document.getElementById('key').value = '';
    document.getElementById('value').value = '';
    document.getElementById('ttl').value = '';
    showResult('Form cleared', 'success');
}

function showResult(message, type = 'info') {
    const resultDiv = document.getElementById('result');
    const className = type === 'success' ? 'terminal-success' :
                     type === 'error' ? 'terminal-error' :
                     type === 'warning' ? 'terminal-warning' : 'terminal-text';
    
    resultDiv.innerHTML = `
        <div class="terminal-line">
            <span class="terminal-prompt">$</span>
            <span class="${className}">${escapeHtml(message)}</span>
        </div>
    `;
}

function copyResult() {
    const result = document.getElementById('result').textContent;
    navigator.clipboard.writeText(result).then(() => {
        showResult('Response copied to clipboard', 'success');
    });
}

// Stats
async function refreshStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const data = await response.json();

        if (response.ok) {
            document.getElementById('totalKeys').textContent = data.total_keys || 0;
            document.getElementById('cacheHits').textContent = data.cache_hits || 0;
            document.getElementById('cacheMisses').textContent = data.cache_misses || 0;
            document.getElementById('uptime').textContent = formatUptime(data.uptime_seconds || 0);
            document.getElementById('logSize').textContent = data.log_size || 0;
            document.getElementById('evictions').textContent = data.evictions || 0;
            document.getElementById('lastCompaction').textContent = data.last_compaction || 'Never';
            
            const hitRate = data.cache_hits + data.cache_misses > 0 
                ? ((data.cache_hits / (data.cache_hits + data.cache_misses)) * 100).toFixed(1)
                : 0;
            document.getElementById('hitRate').textContent = hitRate + '%';

            // Update quick stats
            document.getElementById('quickKeys').textContent = data.total_keys || 0;
        }
    } catch (error) {
        console.error('Failed to refresh stats:', error);
    }
}

async function refreshPerformance() {
    try {
        const response = await fetch(`${API_URL}/performance`);
        const data = await response.json();

        if (response.ok && !data.error) {
            document.getElementById('opsPerSec').textContent = (data.operations_per_second || 0).toFixed(1);
            document.getElementById('avgLatency').textContent = (data.avg_latency_ms || 0).toFixed(2) + 'ms';
            document.getElementById('p95Latency').textContent = (data.p95_latency_ms || 0).toFixed(2) + 'ms';
            document.getElementById('p99Latency').textContent = (data.p99_latency_ms || 0).toFixed(2) + 'ms';
            document.getElementById('errorRate').textContent = (data.error_rate || 0).toFixed(1) + '%';
        }
    } catch (error) {
        console.error('Failed to refresh performance:', error);
    }
}

async function triggerCompaction() {
    try {
        const response = await fetch(`${API_URL}/compact`, { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            showResult(`Compaction triggered successfully\n${JSON.stringify(data, null, 2)}`, 'success');
            setTimeout(refreshStats, 1000);
        } else {
            showResult(`Compaction failed\n${JSON.stringify(data, null, 2)}`, 'error');
        }
    } catch (error) {
        showResult(`Network Error: ${error.message}`, 'error');
    }
}

// Namespaces
async function refreshNamespaces() {
    const container = document.getElementById('namespacesList');
    container.innerHTML = '<div class="loading">Loading namespaces...</div>';

    try {
        const response = await fetch(`${API_URL}/namespaces`);
        const data = await response.json();

        if (response.ok && data.namespaces && data.namespaces.length > 0) {
            container.innerHTML = '';
            
            for (const ns of data.namespaces) {
                const card = await createNamespaceCard(ns);
                container.appendChild(card);
            }

            document.getElementById('quickNamespaces').textContent = data.count || 0;
        } else {
            container.innerHTML = '<div class="loading">No namespaces found</div>';
            document.getElementById('quickNamespaces').textContent = '0';
        }
    } catch (error) {
        container.innerHTML = '<div class="loading">Error loading namespaces</div>';
        console.error('Failed to refresh namespaces:', error);
    }
}

async function createNamespaceCard(namespace) {
    const card = document.createElement('div');
    card.className = 'namespace-card';

    // Get namespace stats
    let stats = { total_keys: 0, cache_hits: 0, cache_misses: 0 };
    try {
        const response = await fetch(`${API_URL}/namespaces/${encodeURIComponent(namespace)}/keys`);
        const data = await response.json();
        if (response.ok) {
            stats.total_keys = data.total_keys || 0;
        }

        const statsResponse = await fetch(`${API_URL}/stats?ns=${encodeURIComponent(namespace)}`);
        const statsData = await statsResponse.json();
        if (statsResponse.ok && statsData.namespace_stats) {
            stats.cache_hits = statsData.namespace_stats.cache_hits || 0;
            stats.cache_misses = statsData.namespace_stats.cache_misses || 0;
        }
    } catch (error) {
        console.error(`Failed to get stats for namespace ${namespace}:`, error);
    }

    card.innerHTML = `
        <div class="namespace-header">
            <div class="namespace-name">${escapeHtml(namespace)}</div>
        </div>
        <div class="namespace-stats">
            <div class="namespace-stat">
                <div class="namespace-stat-value">${stats.total_keys}</div>
                <div class="namespace-stat-label">Keys</div>
            </div>
            <div class="namespace-stat">
                <div class="namespace-stat-value">${stats.cache_hits}</div>
                <div class="namespace-stat-label">Hits</div>
            </div>
            <div class="namespace-stat">
                <div class="namespace-stat-value">${stats.cache_misses}</div>
                <div class="namespace-stat-label">Misses</div>
            </div>
        </div>
        <div class="namespace-actions">
            <button class="btn btn-secondary btn-sm" onclick="viewNamespace('${escapeHtml(namespace)}')">
                View
            </button>
            <button class="btn btn-danger btn-sm" onclick="clearNamespace('${escapeHtml(namespace)}')">
                Clear
            </button>
        </div>
    `;

    return card;
}

function viewNamespace(namespace) {
    document.getElementById('namespace').value = namespace;
    switchTab('operations');
}

async function clearNamespace(namespace) {
    if (!confirm(`Are you sure you want to clear all keys in namespace "${namespace}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/namespaces/${encodeURIComponent(namespace)}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (response.ok) {
            showResult(`Cleared namespace "${namespace}"\n${data.keys_deleted} keys deleted`, 'success');
            refreshNamespaces();
            refreshStats();
        } else {
            showResult(`Failed to clear namespace\n${JSON.stringify(data, null, 2)}`, 'error');
        }
    } catch (error) {
        showResult(`Network Error: ${error.message}`, 'error');
    }
}

async function loadNamespaceList() {
    try {
        const response = await fetch(`${API_URL}/namespaces`);
        const data = await response.json();

        if (response.ok && data.namespaces) {
            const datalist = document.getElementById('namespace-list');
            datalist.innerHTML = '';
            data.namespaces.forEach(ns => {
                const option = document.createElement('option');
                option.value = ns;
                datalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load namespace list:', error);
    }
}

// CLI
function executeCLI() {
    const input = document.getElementById('cliInput');
    const command = input.value.trim();
    
    if (!command) return;

    addCLILine(`pykv> ${command}`, 'cli-text');
    input.value = '';

    parseCLICommand(command);
}

async function parseCLICommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toUpperCase();

    // Parse flags
    const flags = {};
    const args = [];
    parts.slice(1).forEach(part => {
        if (part.startsWith('--')) {
            const [key, value] = part.substring(2).split('=');
            flags[key] = value || true;
        } else {
            args.push(part);
        }
    });

    try {
        switch(cmd) {
            case 'SET':
                if (args.length < 2) {
                    addCLILine('Error: SET requires key and value', 'terminal-error');
                    return;
                }
                await cliSet(args[0], args.slice(1).join(' '), flags);
                break;

            case 'GET':
                if (args.length < 1) {
                    addCLILine('Error: GET requires key', 'terminal-error');
                    return;
                }
                await cliGet(args[0], flags);
                break;

            case 'DEL':
            case 'DELETE':
                if (args.length < 1) {
                    addCLILine('Error: DEL requires key', 'terminal-error');
                    return;
                }
                await cliDelete(args[0], flags);
                break;

            case 'STATS':
                await cliStats(flags);
                break;

            case 'NAMESPACES':
                await cliNamespaces();
                break;

            case 'CLEAR':
                if (args.length < 1) {
                    addCLILine('Error: CLEAR requires namespace', 'terminal-error');
                    return;
                }
                await cliClearNamespace(args[0]);
                break;

            case 'HELP':
                showCLIHelp();
                break;

            default:
                addCLILine(`Unknown command: ${cmd}`, 'terminal-error');
                addCLILine('Type HELP for available commands', 'cli-text');
        }
    } catch (error) {
        addCLILine(`Error: ${error.message}`, 'terminal-error');
    }
}

async function cliSet(key, value, flags) {
    const payload = { key, value };
    if (flags.ttl) payload.ttl = parseInt(flags.ttl);
    if (flags.ns) payload.namespace = flags.ns;

    const url = flags.ns ? `${API_URL}/set?ns=${encodeURIComponent(flags.ns)}` : `${API_URL}/set`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (response.ok) {
        addCLILine('OK', 'terminal-success');
    } else {
        addCLILine(`Error: ${JSON.stringify(data)}`, 'terminal-error');
    }
}

async function cliGet(key, flags) {
    const url = flags.ns 
        ? `${API_URL}/get/${encodeURIComponent(key)}?ns=${encodeURIComponent(flags.ns)}`
        : `${API_URL}/get/${encodeURIComponent(key)}`;
    
    const response = await fetch(url);
    
    if (response.ok) {
        const data = await response.json();
        addCLILine(`"${data.value}"`, 'terminal-success');
    } else if (response.status === 404) {
        addCLILine('(nil)', 'terminal-warning');
    } else {
        const error = await response.json();
        addCLILine(`Error: ${JSON.stringify(error)}`, 'terminal-error');
    }
}

async function cliDelete(key, flags) {
    const url = flags.ns 
        ? `${API_URL}/delete/${encodeURIComponent(key)}?ns=${encodeURIComponent(flags.ns)}`
        : `${API_URL}/delete/${encodeURIComponent(key)}`;
    
    const response = await fetch(url, { method: 'DELETE' });
    
    if (response.ok) {
        addCLILine('(integer) 1', 'terminal-success');
    } else if (response.status === 404) {
        addCLILine('(integer) 0', 'terminal-warning');
    } else {
        const error = await response.json();
        addCLILine(`Error: ${JSON.stringify(error)}`, 'terminal-error');
    }
}

async function cliStats(flags) {
    const url = flags.ns ? `${API_URL}/stats?ns=${encodeURIComponent(flags.ns)}` : `${API_URL}/stats`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
        Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'object') {
                addCLILine(`${key}: ${JSON.stringify(value)}`, 'cli-text');
            } else {
                addCLILine(`${key}: ${value}`, 'cli-text');
            }
        });
    } else {
        addCLILine(`Error: ${JSON.stringify(data)}`, 'terminal-error');
    }
}

async function cliNamespaces() {
    const response = await fetch(`${API_URL}/namespaces`);
    const data = await response.json();

    if (response.ok) {
        if (data.namespaces && data.namespaces.length > 0) {
            data.namespaces.forEach((ns, i) => {
                addCLILine(`${i + 1}) "${ns}"`, 'cli-text');
            });
        } else {
            addCLILine('(empty list)', 'terminal-warning');
        }
    } else {
        addCLILine(`Error: ${JSON.stringify(data)}`, 'terminal-error');
    }
}

async function cliClearNamespace(namespace) {
    const response = await fetch(`${API_URL}/namespaces/${encodeURIComponent(namespace)}`, {
        method: 'DELETE'
    });
    const data = await response.json();

    if (response.ok) {
        addCLILine(`OK - ${data.keys_deleted} keys deleted`, 'terminal-success');
    } else {
        addCLILine(`Error: ${JSON.stringify(data)}`, 'terminal-error');
    }
}

function showCLIHelp() {
    const commands = [
        'SET key value [--ttl=N] [--ns=namespace]',
        'GET key [--ns=namespace]',
        'DEL key [--ns=namespace]',
        'STATS [--ns=namespace]',
        'NAMESPACES',
        'CLEAR namespace',
        'HELP'
    ];
    
    addCLILine('Available commands:', 'cli-text');
    commands.forEach(cmd => addCLILine(`  ${cmd}`, 'cli-text'));
}

function addCLILine(text, className = 'cli-text') {
    const output = document.getElementById('cliOutput');
    const line = document.createElement('div');
    line.className = 'cli-line';
    line.innerHTML = `<span class="${className}">${escapeHtml(text)}</span>`;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

function clearCLI() {
    document.getElementById('cliOutput').innerHTML = `
        <div class="cli-line">
            <span class="cli-prompt">pykv></span>
            <span class="cli-text">Terminal cleared</span>
        </div>
    `;
}

// Utilities
function formatUptime(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
}


// Integration Tab Functions
function switchLanguage(language) {
    // Update tabs
    document.querySelectorAll('.lang-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase() === language.toLowerCase()) {
            tab.classList.add('active');
        }
    });

    // Update examples
    document.querySelectorAll('.code-example').forEach(example => {
        example.classList.remove('active');
    });
    const targetExample = document.getElementById(`${language}-example`);
    if (targetExample) {
        targetExample.classList.add('active');
    }
}

function copyCode(elementId) {
    const codeElement = document.getElementById(elementId);
    if (!codeElement) return;
    
    const code = codeElement.textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        // Find the button that was clicked
        const buttons = document.querySelectorAll('.copy-btn');
        buttons.forEach(btn => {
            if (btn.onclick && btn.onclick.toString().includes(elementId)) {
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.background = '#10b981';
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            }
        });
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy code. Please copy manually.');
    });
}

// Update server URL in integration tab
function updateServerUrl() {
    const urlElement = document.getElementById('serverUrl');
    if (urlElement) {
        urlElement.textContent = API_URL;
    }
}

// Initialize integration tab
document.addEventListener('DOMContentLoaded', function() {
    updateServerUrl();
    
    // Add click handlers to language tabs
    document.querySelectorAll('.lang-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const language = this.textContent.toLowerCase();
            switchLanguage(language);
        });
    });
});
