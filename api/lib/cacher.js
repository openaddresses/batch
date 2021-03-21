const memjs = require('memjs');

/**
 * @class Cacher
 */
class Cacher {
    constructor() {
        this.cache = memjs.Client.create();
    }

    /**
     * Attempt to retrieve a value from memcached, fallback to an async function
     * caching the results and returning
     *
     * @param {String} key memcached key to attempt to retrieve
     * @param {function} miss Async Function to fallback to
     * @param {boolean} [isJSON=true] Should we automatically parse to JSON
     */
    async get(key, miss, isJSON = true) {
        let res;

        try {
            if (!key) throw new Error('Miss');

            let cached = await this.cache.get(key);

            if (!cached.value) throw new Error('Miss');
            if (isJSON) cached = JSON.parse(cached.value);

            if (process.env.DEBUG) console.error(`ok - HIT: ${key}`);
            return cached;
        } catch (err) {
            if (res) return res;

            if (process.env.DEBUG) console.error(`ok - MISS: ${key}`);
            const fresh = await miss();

            try {
                if (key) {
                    if (isJSON) {
                        await this.cache.set(key, JSON.stringify(fresh), {
                            expires: 604800
                        });
                    } else {
                        await this.cache.set(key, fresh, {
                            expires: 604800
                        });
                    }
                }
            } finally {
                return fresh;
            }
        }
    }

    /**
     * If the cache key is set to false, a cache miss is forced
     * This function forces a cache miss if any query params are set
     *
     * @param {Object} obj Object to test
     * @param {String} key Default Cache Key
     */
    static Miss(obj, key) {
        if (!obj) return key;
        if (Object.keys(obj).length === 0 && obj.constructor === Object) return key;
        return false;
    }

    async del(key) {
        try {
            await this.cache.get(key);
        } catch (err) {
            console.error(err);
        }

        return true;
    }
}

module.exports = Cacher;
