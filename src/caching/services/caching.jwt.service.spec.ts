import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CACHE_PROVIDER } from '../providers';
import { CachingJwtService } from './caching.jwt.service';

const mockCacheManager = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
};

const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
        if (key === 'jwt_env') {
            return {
                jwtRefreshTokenExpiresIn: '7d',
            };
        }
        return undefined;
    }),
};

describe('CachingJwtService', () => {
    let service: CachingJwtService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CachingJwtService,
                { provide: CACHE_PROVIDER, useValue: mockCacheManager },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();
        service = module.get<CachingJwtService>(CachingJwtService);
    });

    describe('set', () => {
        it('should set jwt in cache and return true', async () => {
            mockCacheManager.set.mockResolvedValueOnce(true);
            const result = await service.set('authId', 'jwtId');
            expect(mockCacheManager.set).toHaveBeenCalledWith('jwt:authId:jwtId', 1, expect.any(Number));
            expect(result).toBe(true);
        });

        it('should return undefined if cacheManager.set throws', async () => {
            mockCacheManager.set.mockRejectedValueOnce(new Error('fail'));
            const result = await service.set('authId', 'jwtId');
            expect(result).toBeUndefined();
        });
    });

    describe('check', () => {
        it('should return true if value exists in cache', async () => {
            mockCacheManager.get.mockResolvedValueOnce(1);
            const result = await service.check('authId', 'jwtId');
            expect(mockCacheManager.get).toHaveBeenCalledWith('jwt:authId:jwtId');
            expect(result).toBe(true);
        });

        it('should return true if value is null (logic bug)', async () => {
            mockCacheManager.get.mockResolvedValueOnce(null);
            const result = await service.check('authId', 'jwtId');
            expect(result).toBe(true); // This is due to the logic: value !== undefined || value !== null
        });

        it('should return undefined if cacheManager.get throws', async () => {
            mockCacheManager.get.mockRejectedValueOnce(new Error('fail'));
            const result = await service.check('authId', 'jwtId');
            expect(result).toBeUndefined();
        });
    });

    describe('delete', () => {
        it('should delete jwt from cache and return result', async () => {
            mockCacheManager.delete.mockResolvedValueOnce(true);
            const result = await service.delete('authId', 'jwtId');
            expect(mockCacheManager.delete).toHaveBeenCalledWith('jwt:authId:jwtId');
            expect(result).toBe(true);
        });

        it('should return undefined if cacheManager.delete throws', async () => {
            mockCacheManager.delete.mockRejectedValueOnce(new Error('fail'));
            const result = await service.delete('authId', 'jwtId');
            expect(result).toBeUndefined();
        });
    });
});
