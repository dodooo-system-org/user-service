import { AuthEntity, AuthStatus } from '@src/database/entities';
import { AuthHelper } from '@src/helpers/auth.helper';
import { UUID } from 'crypto';
import { DataSource } from 'typeorm';

import { Test, TestingModule } from '@nestjs/testing';

import { JwtService } from '.';
import { UserService } from '../../user/user.service';
import { AuthRepository } from '../repositories';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let service: AuthService;
    let authRepository: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: AuthRepository,
                    useValue: {
                        findOneByEmail: jest.fn(),
                    },
                },
                {
                    provide: UserService,
                    useValue: {},
                },
                {
                    provide: JwtService,
                    useValue: {},
                },
                {
                    provide: DataSource,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        authRepository = module.get<AuthRepository>(AuthRepository);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateLocalAuth', () => {
        it('should return auth entity if credentials are valid', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'validPassword',
            };
            const authEntity: AuthEntity = {
                authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                email: payload.email,
                username: 'johndoe',
                password: 'hashedPassword',
                status: AuthStatus.ACTIVE,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
            };

            authRepository.findOneByEmail.mockResolvedValue(authEntity);
            jest.spyOn(AuthHelper, 'compareHashedText').mockResolvedValue(true);

            const result = await service.validateLocalAuth(payload);

            expect(result).toEqual(authEntity);
            expect(authRepository.findOneByEmail).toHaveBeenCalledWith(payload.email);
            expect(AuthHelper.compareHashedText).toHaveBeenCalledWith(payload.password, authEntity.password);
        });
        it('should throw NotFoundException if auth not found', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'validPassword',
            };

            authRepository.findOneByEmail.mockResolvedValue(null);

            await expect(service.validateLocalAuth(payload)).rejects.toMatchObject({
                message: 'Account not found',
            });
            expect(authRepository.findOneByEmail).toHaveBeenCalledWith(payload.email);
        });
        it('should throw ForbiddenException if account is suspended', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'validPassword',
            };

            const authEntity: AuthEntity = {
                authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                email: payload.email,
                username: 'johndoe',
                password: 'hashedPassword',
                status: AuthStatus.SUSPENDED,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
            };

            authRepository.findOneByEmail.mockResolvedValue(authEntity);

            await expect(service.validateLocalAuth(payload)).rejects.toMatchObject({
                message: 'Your account has been suspended',
            });
            expect(authRepository.findOneByEmail).toHaveBeenCalledWith(payload.email);
            expect(AuthHelper.compareHashedText).not.toHaveBeenCalled();
        });

        it('should throw ForbiddenException if account is deleted', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'validPassword',
            };

            const authEntity: AuthEntity = {
                authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                email: payload.email,
                username: 'johndoe',
                password: 'hashedPassword',
                status: AuthStatus.DELETED,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
            };

            authRepository.findOneByEmail.mockResolvedValue(authEntity);

            await expect(service.validateLocalAuth(payload)).rejects.toMatchObject({
                message: 'Account not found',
            });
            expect(authRepository.findOneByEmail).toHaveBeenCalledWith(payload.email);
            expect(AuthHelper.compareHashedText).not.toHaveBeenCalled();
        });

        it('should throw ForbiddenException if account is inactive', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'validPassword',
            };

            const authEntity: AuthEntity = {
                authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                email: payload.email,
                username: 'johndoe',
                password: 'hashedPassword',
                status: AuthStatus.INACTIVE,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
            };

            authRepository.findOneByEmail.mockResolvedValue(authEntity);

            await expect(service.validateLocalAuth(payload)).rejects.toMatchObject({
                message: 'Account is not verified',
            });
            expect(authRepository.findOneByEmail).toHaveBeenCalledWith(payload.email);
            expect(AuthHelper.compareHashedText).not.toHaveBeenCalled();
        });

        it('should throw invalid credentials if not matching password', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'invalidPassword',
            };

            const authEntity: AuthEntity = {
                authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                email: payload.email,
                username: 'johndoe',
                password: 'hashedPassword',
                status: AuthStatus.ACTIVE,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
            };

            authRepository.findOneByEmail.mockResolvedValue(authEntity);
            jest.spyOn(AuthHelper, 'compareHashedText').mockResolvedValue(false);

            await expect(service.validateLocalAuth(payload)).rejects.toMatchObject({
                message: 'Invalid email or password',
            });
            expect(authRepository.findOneByEmail).toHaveBeenCalledWith(payload.email);
        });
        it('should throw error if an unexpected error occurs', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'anyPassword',
            };
            const unexpectedError = new Error('Unexpected error');
            authRepository.findOneByEmail.mockRejectedValue(unexpectedError);

            await expect(service.validateLocalAuth(payload)).rejects.toThrow('An unexpected error occurred');
            expect(authRepository.findOneByEmail).toHaveBeenCalledWith(payload.email);
        });
    });
});
