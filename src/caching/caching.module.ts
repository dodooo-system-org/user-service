import { Cacheable } from 'cacheable';

import { Inject, Logger, Module, OnModuleInit } from '@nestjs/common';

import { CACHE_PROVIDER, CacheProvider } from './providers';
import { CachingJwtService } from './services';
import { CachingAuthService } from './services/caching.auth.service';

@Module({
    providers: [CacheProvider, CachingJwtService, CachingAuthService],
    exports: [CachingJwtService, CachingAuthService],
})
export class CachingModule implements OnModuleInit {
    private readonly logger = new Logger(CachingModule.name);
    constructor(@Inject(CACHE_PROVIDER) private readonly cacheManager: Cacheable) {}

    async onModuleInit() {
        try {
            await this.cacheManager.set('init_check', true, 60 * 1000);
            this.logger.verbose('Cache initialized successfully');
        } catch (error) {
            this.logger.error(error);
        }
    }
}
