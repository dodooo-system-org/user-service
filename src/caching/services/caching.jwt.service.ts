import { JwtConfig } from '@src/configs/configuration.config';
import { Cacheable } from 'cacheable';
import * as ms from 'ms';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CACHE_PROVIDER } from '../providers';

@Injectable()
export class CachingJwtService {
    private readonly logger = new Logger(CachingJwtService.name);
    private readonly ttl: number;
    constructor(
        @Inject(CACHE_PROVIDER) private readonly cacheManager: Cacheable,
        private readonly configService: ConfigService,
    ) {
        const jwtConfig = this.configService.get<JwtConfig>('jwt_env');
        this.ttl = jwtConfig?.jwtRefreshTokenExpiresIn
            ? ms(jwtConfig?.jwtRefreshTokenExpiresIn as ms.StringValue)
            : 604800; // Default to 7 days if not set
    }

    /* Return undefined if the cache is not initialized or if an error occurs *

    /**
     * Sets a JWT in the cache for a user.
     * @param authId
     * @param jwtId
     * @returns Promise<boolean | undefined>
     */
    async set(authId: string, jwtId: string): Promise<boolean | undefined> {
        try {
            const key = `jwt:${authId}:${jwtId}`;
            await this.cacheManager.set(key, 1, this.ttl);
            return true;
        } catch (error) {
            this.logger.error('Error setting JWT in cache:', error);
            return undefined;
        }
    }

    /**
     * Check a valid JWT in the cache for a user.
     * @param authId
     * @param jwtId
     * @returns Promise<boolean | undefined>
     */
    async check(authId: string, jwtId: string): Promise<boolean | undefined> {
        try {
            const key = `jwt:${authId}:${jwtId}`;
            const value = await this.cacheManager.get(key);
            return value !== undefined || value !== null;
        } catch (error) {
            this.logger.error('Error checking JWT in cache:', error);
            return undefined;
        }
    }

    /**
     * Deletes a JWT from the cache for a user.
     * @param authId
     * @param jwtId
     * @returns Promise<boolean | undefined>
     */
    async delete(authId: string, jwtId: string): Promise<boolean | undefined> {
        try {
            const key = `jwt:${authId}:${jwtId}`;
            return await this.cacheManager.delete(key);
        } catch (error) {
            this.logger.error('Error deleting JWT from cache:', error);
            return undefined;
        }
    }
}
