import { CachingJwtService } from '@src/caching/services';
import { UUID } from 'crypto';

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtRepository } from '../repositories';
import { JwtService } from './jwt.service';

describe('JwtService', () => {
    let service: any;
    let jwtRepository: any;
    let cachingJwtService: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            if (key === 'jwt_env') {
                                return {
                                    secret: 'test_jwt_secret',
                                    jwtAccessTokenExpiresIn: '1h',
                                    jwtRefreshTokenExpiresIn: '7d',
                                };
                            }
                            return undefined;
                        }),
                    },
                },
                {
                    provide: JwtRepository,
                    useValue: {
                        save: jest.fn(),
                    },
                },
                {
                    provide: CachingJwtService,
                    useValue: {
                        set: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<JwtService>(JwtService);
        jwtRepository = module.get<JwtRepository>(JwtRepository);
        cachingJwtService = module.get<CachingJwtService>(CachingJwtService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateTokens', () => {
        const payload = { sub: 'db10bd54-8366-4bdc-8271-f256ed4d8510' as UUID, email: 'johndoe@email.com' };
        it('should generate access and refresh tokens', async () => {
            const accessToken = {
                token: 'accessToken',
                expiresIn: 3600000,
            };
            const refreshToken = {
                token: 'refreshToken',
                expiresIn: 604800000,
            };

            const expectedResponse = {
                accessToken,
                refreshToken,
            };

            // Mock signAsync for access and refresh tokens
            jest.spyOn(service, 'signAsync')
                .mockImplementationOnce(async () => accessToken.token) // access token
                .mockImplementationOnce(async () => refreshToken.token); // refresh token

            // Mock cachingJwtService.set
            cachingJwtService.set.mockResolvedValue(true);
            // Mock jwtRepository.save
            jwtRepository.save.mockResolvedValue({});

            const result = await service.generateTokens(payload);

            expect(result).toEqual(expectedResponse);
            expect(service.signAsync).toHaveBeenCalledTimes(2);
            expect(cachingJwtService.set).toHaveBeenCalledWith(payload.sub, expect.any(String));
            expect(jwtRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    jwtId: expect.any(String),
                    auth: { authId: payload.sub },
                    expiresAt: expect.any(Date),
                }),
            );
        });

        it('should throw if signAsync fails', async () => {
            jest.spyOn(service, 'signAsync').mockRejectedValue(new Error('sign error'));
            await expect(service.generateTokens(payload)).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });
        });

        it('should throw if cachingJwtService.set fails', async () => {
            const accessToken = {
                token: 'accessToken',
                expiresIn: 3600000,
            };
            const refreshToken = {
                token: 'refreshToken',
                expiresIn: 604800000,
            };
            const expectedResponse = {
                accessToken,
                refreshToken,
            };

            jest.spyOn(service, 'signAsync')
                .mockImplementationOnce(async () => accessToken.token)
                .mockImplementationOnce(async () => refreshToken.token);

            cachingJwtService.set.mockResolvedValue(undefined);

            const result = await service.generateTokens(payload);
            expect(result).toEqual(expectedResponse);
        });

        it('should throw if jwtRepository.save fails', async () => {
            const accessToken = {
                token: 'accessToken',
                expiresIn: 3600000,
            };
            const refreshToken = {
                token: 'refreshToken',
                expiresIn: 604800000,
            };

            jest.spyOn(service, 'signAsync')
                .mockImplementationOnce(async () => 'accessToken')
                .mockImplementationOnce(async () => 'refreshToken');
            cachingJwtService.set.mockResolvedValue(true);
            jwtRepository.save.mockRejectedValueOnce(new Error('db error'));
            await expect(service.generateTokens(payload)).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });
        });
    });
});
