import { Cacheable } from 'cacheable';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { CACHE_PROVIDER } from '../providers';

@Injectable()
export class CachingAuthService {
    private readonly logger = new Logger(CachingAuthService.name);
    private readonly resendEmailVerify = 'email_verify';
    constructor(@Inject(CACHE_PROVIDER) private readonly cacheManager: Cacheable) {}

    async cachingResendEmailVerify(authId: string, ttl: number): Promise<void> {
        try {
            const key = `${this.resendEmailVerify}:${authId}`;
            await this.cacheManager.set(key, true, ttl || '24h');
        } catch (error) {
            this.logger.error('Error caching resend email verification: ', error);
        }
    }

    async getTTLResendEmailVerify(authId: string): Promise<number> {
        try {
            const key = `${this.resendEmailVerify}:${authId}`;
            const ttl = (await this.getKeyTTL(key)) || 0;
            return ttl;
        } catch (error) {
            this.logger.error('Error caching resend email verification: ', error);
            return 0;
        }
    }

    /* eslint-disable */
    /**
     * Get the TTL (time-to-live in seconds) of a key in Redis.
     * @param key The cache key to check
     * @returns TTL in seconds, or null if not found or error
     */
    async getKeyTTL(key: string): Promise<number | null> {
        try {
            // @ts-ignore: Accessing secondary store (KeyvRedis) from Cacheable
            const redisStore = this.cacheManager.secondary;
            if (!redisStore) {
                this.logger.error('Redis store not available');
                return null;
            }
            // Try to access the underlying KeyvRedis instance
            const keyvRedis = redisStore.store || redisStore;
            if (!keyvRedis.getClient || !keyvRedis.createKeyPrefix) {
                this.logger.error('KeyvRedis methods not available');
                return null;
            }
            const namespacedKey = keyvRedis.createKeyPrefix(key, keyvRedis.namespace);
            const client = await keyvRedis.getClient();
            if (!client || typeof client.ttl !== 'function') {
                this.logger.error('Redis client or ttl method not available');
                return null;
            }
            const ttl = await client.ttl(namespacedKey);
            return ttl;
        } catch (error) {
            this.logger.error('Error getting TTL for key:', error);
            return null;
        }
    }
    /* eslint-enable */
}
