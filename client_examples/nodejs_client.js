/**
 * PyKV Node.js Client - Ready to Use
 * 
 * Installation:
 *   npm install axios
 * 
 * Usage:
 *   const PyKVClient = require('./nodejs_client');
 *   const client = new PyKVClient('http://localhost:8000');
 *   await client.set('user:123', 'alice', { ttl: 3600, namespace: 'myapp' });
 */

const axios = require('axios');

class PyKVClient {
    /**
     * Initialize PyKV client
     * @param {string} baseURL - PyKV server URL
     * @param {string} defaultNamespace - Default namespace for all operations
     * @param {number} timeout - Request timeout in milliseconds
     */
    constructor(baseURL = 'http://localhost:8000', defaultNamespace = null, timeout = 5000) {
        this.client = axios.create({
            baseURL,
            timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        this.defaultNamespace = defaultNamespace;
    }

    /**
     * Store a key-value pair
     * @param {string} key - The key to store
     * @param {string} value - The value to store
     * @param {Object} options - Options (ttl, namespace)
     * @returns {Promise<Object>} Response object
     */
    async set(key, value, options = {}) {
        const { ttl, namespace } = options;
        const ns = namespace || this.defaultNamespace;
        const url = ns ? `/set?ns=${ns}` : '/set';
        
        const payload = { key, value };
        if (ttl) payload.ttl = ttl;
        
        try {
            const response = await this.client.post(url, payload);
            return response.data;
        } catch (error) {
            throw new PyKVError(`Failed to set key '${key}': ${error.message}`);
        }
    }

    /**
     * Retrieve a value by key
     * @param {string} key - The key to retrieve
     * @param {string} namespace - Namespace for isolation
     * @param {*} defaultValue - Default value if key not found
     * @returns {Promise<string|null>} The value or default
     */
    async get(key, namespace = null, defaultValue = null) {
        const ns = namespace || this.defaultNamespace;
        const url = ns ? `/get/${key}?ns=${ns}` : `/get/${key}`;
        
        try {
            const response = await this.client.get(url);
            return response.data.value;
        } catch (error) {
            if (error.response?.status === 404) {
                return defaultValue;
            }
            throw new PyKVError(`Failed to get key '${key}': ${error.message}`);
        }
    }

    /**
     * Delete a key
     * @param {string} key - The key to delete
     * @param {string} namespace - Namespace for isolation
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(key, namespace = null) {
        const ns = namespace || this.defaultNamespace;
        const url = ns ? `/delete/${key}?ns=${ns}` : `/delete/${key}`;
        
        try {
            const response = await this.client.delete(url);
            return response.status === 200;
        } catch (error) {
            if (error.response?.status === 404) {
                return false;
            }
            throw new PyKVError(`Failed to delete key '${key}': ${error.message}`);
        }
    }

    /**
     * Get statistics
     * @param {string} namespace - Get stats for specific namespace
     * @returns {Promise<Object>} Statistics object
     */
    async stats(namespace = null) {
        const url = namespace ? `/stats?ns=${namespace}` : '/stats';
        
        try {
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            throw new PyKVError(`Failed to get stats: ${error.message}`);
        }
    }

    /**
     * List all active namespaces
     * @returns {Promise<Array>} List of namespace names
     */
    async listNamespaces() {
        try {
            const response = await this.client.get('/namespaces');
            return response.data.namespaces;
        } catch (error) {
            throw new PyKVError(`Failed to list namespaces: ${error.message}`);
        }
    }

    /**
     * Clear all keys in a namespace
     * @param {string} namespace - Namespace to clear
     * @returns {Promise<number>} Number of keys deleted
     */
    async clearNamespace(namespace) {
        try {
            const response = await this.client.delete(`/namespaces/${namespace}`);
            return response.data.keys_deleted;
        } catch (error) {
            throw new PyKVError(`Failed to clear namespace '${namespace}': ${error.message}`);
        }
    }

    /**
     * Check if PyKV server is healthy
     * @returns {Promise<boolean>} True if healthy
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health');
            return response.status === 200;
        } catch {
            return false;
        }
    }
}

class PyKVError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PyKVError';
    }
}

// ============================================
// USAGE EXAMPLES
// ============================================

async function examples() {
    const client = new PyKVClient('http://localhost:8000');

    console.log('Example 1: Basic Usage');
    await client.set('user:123', 'alice');
    const value = await client.get('user:123');
    console.log(`Value: ${value}`);
    await client.delete('user:123');
    console.log();

    console.log('Example 2: With Namespace');
    await client.set('user:456', 'bob', { namespace: 'app1' });
    await client.set('user:456', 'charlie', { namespace: 'app2' });
    
    const app1User = await client.get('user:456', 'app1');
    const app2User = await client.get('user:456', 'app2');
    console.log(`App1 user: ${app1User}`);
    console.log(`App2 user: ${app2User}`);
    console.log();

    console.log('Example 3: With TTL');
    await client.set('session:xyz', 'active', { ttl: 60, namespace: 'sessions' });
    const session = await client.get('session:xyz', 'sessions');
    console.log(`Session: ${session}`);
    console.log();

    console.log('Example 4: Caching Pattern');
    
    async function getUserFromDB(userId) {
        console.log(`  Fetching user ${userId} from database...`);
        return { id: userId, name: 'Alice', email: 'alice@example.com' };
    }
    
    async function getUserCached(userId) {
        const cacheKey = `user:${userId}`;
        
        // Try cache first
        const cached = await client.get(cacheKey, 'cache');
        if (cached) {
            console.log('  Cache hit!');
            return JSON.parse(cached);
        }
        
        // Fetch from database
        console.log('  Cache miss!');
        const user = await getUserFromDB(userId);
        
        // Store in cache for 5 minutes
        await client.set(cacheKey, JSON.stringify(user), { 
            ttl: 300, 
            namespace: 'cache' 
        });
        
        return user;
    }
    
    // First call - cache miss
    const user1 = await getUserCached(123);
    console.log(`  User:`, user1);
    
    // Second call - cache hit
    const user2 = await getUserCached(123);
    console.log(`  User:`, user2);
    console.log();

    console.log('Example 5: Statistics');
    const stats = await client.stats();
    console.log(`Total keys: ${stats.total_keys}`);
    console.log(`Cache hits: ${stats.cache_hits}`);
    console.log(`Cache misses: ${stats.cache_misses}`);
    console.log();

    console.log('Example 6: Namespace Management');
    const namespaces = await client.listNamespaces();
    console.log(`Active namespaces:`, namespaces);
    console.log();

    console.log('All examples completed!');
}

// Export for use in other modules
module.exports = PyKVClient;

// Run examples if executed directly
if (require.main === module) {
    examples().catch(console.error);
}
