import memjs from 'memjs';

/**
 * @class
 */
export default class Cacher {
    nocache: boolean;
    cache: memjs.Client;

    constructor(nocache = false, silent = false) {
        this.nocache = nocache;

        if (!silent) {
            if (nocache) console.error('ok - Memcached Disabled');
            else console.error('ok - Memcached Enabled');
        }

        this.cache = memjs.Client.create();
    }

    /**
     * Attempt to retrieve a value from memcached, fallback to an async function
     * caching the results and returning
     *
     * @param key    memcached key to attempt to retrieve
     * @param miss   Async Function to fallback to
     * @param isJSON Should we automatically parse to JSON
     */
    async get<T>(key: string | false, miss: () => Promise<T>, isJSON = true): Promise<T> {
        try {
            if (!key || this.nocache) throw new Error('Miss');

            const cached = await this.cache.get(key);

            if (!cached.value) throw new Error('Miss');
            if (isJSON) {
                return JSON.parse(cached.value.toString()) as T;
            } else {
                return cached.value as unknown as T;
            }
        } catch (err) {
            console.error(err);

            const fresh = await miss();

            try {
                if (key && !this.nocache) {
                    if (isJSON) {
                        await this.cache.set(key, JSON.stringify(fresh), {
                            expires: 604800,
                        });
                    } else {
                        await this.cache.set(key, fresh as unknown as string | Buffer, {
                            expires: 604800,
                        });
                    }
                }
            } catch (err) {
                console.error(err);
            }

            return fresh;
        }
    }

    /**
     * If the cache key is set to false, a cache miss is forced
     * This function forces a cache miss if any query params are set
     *
     * @param obj Object to test
     * @param key Default Cache Key
     */
    static Miss(obj: unknown, key: string): string | false {
        if (!obj) return key;
        if (typeof obj === 'object' && Object.keys(obj).length === 0 && obj.constructor === Object) return key;
        return false;
    }

    /**
     * Delete a key from the cache
     */
    async del(key: string): Promise<boolean> {
        try {
            await this.cache.delete(key);
        } catch (err) {
            console.error(err);
        }

        return true;
    }

    /**
     * Flush the entire cache
     */
    async flush(): Promise<void> {
        try {
            await this.cache.flush();
        } catch (err) {
            console.error(err);
            throw new Error('Failed to flush cache');
        }
    }
}
