import KeyvRedis from '@keyv/redis';
import { CacheConfig } from '@src/configs/configuration.config';
import { Cacheable } from 'cacheable';

import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const CACHE_PROVIDER = 'CACHE_PROVIDER';

export const CacheProvider: Provider = {
    provide: CACHE_PROVIDER,
    useFactory: (configService: ConfigService) => {
        const logger = new Logger('CacheProvider');
        const cacheConfig = configService.get<CacheConfig>('cache_env');
        const secondary = new KeyvRedis({
            username: cacheConfig?.username,
            password: cacheConfig?.password,
            socket: {
                host: cacheConfig?.host,
                port: cacheConfig?.port,
                reconnectStrategy: (attempt) => {
                    if (attempt > 5) {
                        return new Error('Max reconnection attempts reached');
                    }
                    return Math.min(attempt * 1000, 30000); // Exponential backoff
                },
            },
        });
        secondary.on('error', (err) => {
            logger.error(err);
        });
        return new Cacheable({ secondary, ttl: cacheConfig?.ttl });
    },
    inject: [ConfigService],
};
