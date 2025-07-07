import { CachingAuthService } from '@src/caching/services/caching.auth.service';
import { SecretKeyConfig } from '@src/configs/configuration.config';
import { AuthEntity, AuthStatus, UserRole } from '@src/database/entities';
import { AuthHelper } from '@src/helpers/auth.helper';
import { EncryptionHelper } from '@src/helpers/encryption.helper';
import { MailerAuthService } from '@src/modules/mailer/services';
import { COMMON_RMQ } from '@src/rmq/rmq.module';
import { UUID } from 'crypto';
import { DataSource } from 'typeorm';

import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtService } from '.';
import { UserService } from '../../user/user.service';
import { AuthRepository } from '../repositories';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let service: AuthService;
    let authRepository: any;
    let dataSource: any;
    let userService: any;
    let jwtService: any;
    let mailerAuthService: any;
    let secretKeyConfig: any;
    let cachingAuthService: any;
    let clientProxy: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            const configMap = {
                                secretkey_env: {
                                    emailVerificationSecret: 'PzaxFKPYKSNeeb1DDA9X5IHzTCK73GIe',
                                    passwordResetSecret: 'test_password_reset_secret',
                                },
                            };
                            return configMap[key];
                        }),
                    },
                },
                {
                    provide: AuthRepository,
                    useValue: {
                        findOneByEmail: jest.fn(),
                        findOneBy: jest.fn(),
                        existByEmail: jest.fn(),
                        existByUsername: jest.fn(),
                        create: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: UserService,
                    useValue: {
                        createUserWithTransaction: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        generateTokens: jest.fn(),
                        revokeRefreshToken: jest.fn(),
                        extractPayloadFromToken: jest.fn(),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        createQueryRunner: jest.fn().mockReturnValue({
                            manager: {
                                save: jest.fn(),
                            },
                            connect: jest.fn(),
                            startTransaction: jest.fn(),
                            commitTransaction: jest.fn(),
                            rollbackTransaction: jest.fn(),
                            release: jest.fn(),
                        }),
                    },
                },
                {
                    provide: MailerAuthService,
                    useValue: {
                        sendEmailVerification: jest.fn(),
                        sendWelcomeEmail: jest.fn(),
                    },
                },
                {
                    provide: CachingAuthService,
                    useValue: {
                        cachingResendEmailVerify: jest.fn(),
                        getTTLResendEmailVerify: jest.fn(),
                        getCachedAuth: jest.fn(),
                        cacheAuth: jest.fn(),
                    },
                },
                {
                    provide: COMMON_RMQ,
                    useValue: {
                        send: jest.fn().mockReturnValue({ toPromise: jest.fn() }),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        authRepository = module.get<AuthRepository>(AuthRepository);
        dataSource = module.get<DataSource>(DataSource);
        userService = module.get<UserService>(UserService);
        jwtService = module.get<JwtService>(JwtService);
        mailerAuthService = module.get<MailerAuthService>(MailerAuthService);
        secretKeyConfig = module.get<ConfigService>(ConfigService).get('secretkey_env') as SecretKeyConfig;
        cachingAuthService = module.get<CachingAuthService>(CachingAuthService);
        clientProxy = module.get(COMMON_RMQ);

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
                username: 'johndoe',
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
                role: UserRole.USER,
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
                username: 'johndoe',
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
                username: 'johndoe',
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
                role: UserRole.USER,
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
                username: 'johndoe',
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
                role: UserRole.USER,
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
                username: 'johndoe',
            };

            const authEntity: AuthEntity = {
                authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                email: payload.email,
                username: 'johndoe',
                password: 'hashedPassword',
                status: AuthStatus.INACTIVE,
                role: UserRole.USER,
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
                username: 'johndoe',
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
                role: UserRole.USER,
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
                username: 'johndoe',
            };
            const unexpectedError = new Error('Unexpected error');
            authRepository.findOneByEmail.mockRejectedValue(unexpectedError);

            await expect(service.validateLocalAuth(payload)).rejects.toThrow('An unexpected error occurred');
            expect(authRepository.findOneByEmail).toHaveBeenCalledWith(payload.email);
        });
    });

    describe('validateJwtAuth', () => {
        it('should return auth entity if payload is valid', async () => {
            const payload = {
                email: 'johndoe@email.com',
                sub: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                iss: 'dodooo',
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
                role: UserRole.USER,
            };

            const { password, ...expectedAuth } = authEntity;

            authRepository.findOneBy.mockResolvedValue(authEntity);

            const result = await service.validateJwtAuth(payload);

            expect(result).toEqual(expectedAuth);
            expect(authRepository.findOneBy).toHaveBeenCalledWith({ authId: payload.sub, email: payload.email });
        });
        it('should throw NotFoundException if auth not found', async () => {
            const payload = {
                email: 'johndoe@email.com',
                sub: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                iss: 'dodooo',
            };

            authRepository.findOneBy.mockResolvedValue(null);

            await expect(service.validateJwtAuth(payload)).rejects.toMatchObject({
                message: 'Account not found',
            });
            expect(authRepository.findOneBy).toHaveBeenCalledWith({ authId: payload.sub, email: payload.email });
        });
        it('should throw ForbiddenException if account is suspended', async () => {
            const payload = {
                email: 'johndoe@email.com',
                sub: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                iss: 'dodooo',
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
                role: UserRole.USER,
            };
            authRepository.findOneBy.mockResolvedValue(authEntity);

            await expect(service.validateJwtAuth(payload)).rejects.toMatchObject({
                message: 'Your account has been suspended',
            });
            expect(authRepository.findOneBy).toHaveBeenCalledWith({ authId: payload.sub, email: payload.email });
        });
        it('should throw ForbiddenException if account is deleted', async () => {
            const payload = {
                email: 'johndoe@email.com',
                sub: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                iss: 'dodooo',
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
                role: UserRole.USER,
            };
            authRepository.findOneBy.mockResolvedValue(authEntity);

            await expect(service.validateJwtAuth(payload)).rejects.toMatchObject({
                message: 'Account not found',
            });
            expect(authRepository.findOneBy).toHaveBeenCalledWith({ authId: payload.sub, email: payload.email });
        });
        it('should throw ForbiddenException if account is inactive', async () => {
            const payload = {
                email: 'johndoe@email.com',
                sub: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                iss: 'dodooo',
            };
            const authEntity: AuthEntity = {
                authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                email: payload.email,
                username: 'johndoe',
                password: 'hashedPassword',
                status: AuthStatus.INACTIVE,
                role: UserRole.USER,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
            };
            authRepository.findOneBy.mockResolvedValue(authEntity);

            await expect(service.validateJwtAuth(payload)).rejects.toMatchObject({
                message: 'Account is not verified',
            });
            expect(authRepository.findOneBy).toHaveBeenCalledWith({ authId: payload.sub, email: payload.email });
        });
        it('should throw error if an unexpected error occurs', async () => {
            const payload = {
                email: 'johndoe@email.com',
                sub: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                iss: 'dodooo',
            };
            const error = new Error('Unexpected error');
            authRepository.findOneBy.mockRejectedValue(error);

            await expect(service.validateJwtAuth(payload)).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });
            expect(authRepository.findOneBy).toHaveBeenCalledWith({ authId: payload.sub, email: payload.email });
        });
    });

    describe('createAuth', () => {
        it('should create auth and return success message', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'validPassword',
                username: 'johndoe',
            };

            const authEntity = {
                authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                email: payload.email,
                username: 'johndoe',
                password: 'hashedPassword',
                status: AuthStatus.INACTIVE,
                role: UserRole.USER,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: null,
            };

            const userEntity = {
                auth: {
                    authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                },
                userId: '123e4567-e89b-12d3-a456-426614174001' as UUID,
            };

            const queryRunner = dataSource.createQueryRunner();
            authRepository.existByEmail.mockResolvedValue(false);
            authRepository.existByUsername.mockResolvedValue(false);
            jest.spyOn(AuthHelper, 'hashText').mockResolvedValue('hashedPassword');
            authRepository.create.mockReturnValue(authEntity);
            queryRunner.manager.save.mockResolvedValue(authEntity);
            userService.createUserWithTransaction.mockResolvedValue(userEntity);
            queryRunner.startTransaction.mockResolvedValue();
            queryRunner.commitTransaction.mockResolvedValue();
            queryRunner.release.mockResolvedValue();
            mailerAuthService.sendEmailVerification.mockResolvedValue();

            const result = await service.createAuth(payload);

            expect(authRepository.existByEmail).toHaveBeenCalledWith(payload.email);
            expect(AuthHelper.hashText).toHaveBeenCalledWith(payload.password);
            expect(authRepository.create).toHaveBeenCalledWith({
                email: payload.email,
                password: 'hashedPassword',
                username: payload.username,
            });
            expect(queryRunner.manager.save).toHaveBeenCalledWith(authEntity);
            expect(userService.createUserWithTransaction).toHaveBeenCalledWith(
                { authId: authEntity.authId },
                queryRunner,
            );
            expect(queryRunner.commitTransaction).toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalled();
            expect(result).toEqual({
                message: 'Account registered successfully, please check your email to verify your account',
            });
        });
        it('should throw BadRequest if existing email', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'validPassword',
                username: 'johndoe',
            };

            const queryRunner = dataSource.createQueryRunner();
            queryRunner.connect.mockResolvedValue();
            queryRunner.startTransaction.mockResolvedValue();
            authRepository.existByEmail.mockResolvedValue(true);

            await expect(service.createAuth(payload)).rejects.toMatchObject({
                message: 'Email already exists',
            });
            expect(AuthHelper.hashText).not.toHaveBeenCalled();
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalled();
        });
        it('should throw BadRequest if existing username', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'validPassword',
                username: 'johndoe',
            };

            const queryRunner = dataSource.createQueryRunner();
            queryRunner.connect.mockResolvedValue();
            queryRunner.startTransaction.mockResolvedValue();
            authRepository.existByEmail.mockResolvedValue(false);
            authRepository.existByUsername.mockResolvedValue(true);

            await expect(service.createAuth(payload)).rejects.toMatchObject({
                message: 'Username already exists',
            });
            expect(AuthHelper.hashText).not.toHaveBeenCalled();
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalled();
        });
        it('should throw BadRequest if existing username', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'validPassword',
                username: 'johndoe',
            };

            const queryRunner = dataSource.createQueryRunner();
            queryRunner.connect.mockResolvedValue();
            queryRunner.startTransaction.mockResolvedValue();
            authRepository.existByEmail.mockResolvedValue(true);

            await expect(service.createAuth(payload)).rejects.toMatchObject({
                message: 'Email already exists',
            });
            expect(AuthHelper.hashText).not.toHaveBeenCalled();
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalled();
        });
        it('should throw error if sending email verification fails', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'validPassword',
                username: 'johndoe',
            };

            const authEntity = {
                authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                email: payload.email,
                username: 'johndoe',
                password: 'hashedPassword',
                status: AuthStatus.INACTIVE,
                role: UserRole.USER,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: null,
            };

            const userEntity = {
                auth: {
                    authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
                },
                userId: '123e4567-e89b-12d3-a456-426614174001' as UUID,
            };

            const queryRunner = dataSource.createQueryRunner();
            authRepository.existByEmail.mockResolvedValue(false);
            authRepository.existByUsername.mockResolvedValue(false);
            jest.spyOn(AuthHelper, 'hashText').mockResolvedValue('hashedPassword');
            authRepository.create.mockReturnValue(authEntity);
            queryRunner.manager.save.mockResolvedValue(authEntity);
            userService.createUserWithTransaction.mockResolvedValue(userEntity);
            queryRunner.startTransaction.mockResolvedValue();
            queryRunner.release.mockResolvedValue();
            mailerAuthService.sendEmailVerification.mockRejectedValue(
                new InternalServerErrorException('Failed to send email verification'),
            );

            await expect(service.createAuth(payload)).rejects.toMatchObject({
                message: 'Failed to send email verification',
            });

            expect(authRepository.existByEmail).toHaveBeenCalledWith(payload.email);
            expect(AuthHelper.hashText).toHaveBeenCalledWith(payload.password);
            expect(authRepository.create).toHaveBeenCalledWith({
                email: payload.email,
                password: 'hashedPassword',
                username: payload.username,
            });
            expect(queryRunner.manager.save).toHaveBeenCalledWith(authEntity);
            expect(userService.createUserWithTransaction).toHaveBeenCalledWith(
                { authId: authEntity.authId },
                queryRunner,
            );
            expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalled();
        });
        it('should throw error if an unexpected error occurs', async () => {
            const payload = {
                email: 'johndoe@email.com',
                password: 'validPassword',
                username: 'johndoe',
            };

            const queryRunner = dataSource.createQueryRunner();
            queryRunner.connect.mockResolvedValue();
            queryRunner.startTransaction.mockResolvedValue();
            authRepository.existByEmail.mockResolvedValue(false);
            authRepository.existByUsername.mockResolvedValue(false);
            jest.spyOn(AuthHelper, 'hashText').mockRejectedValue(new Error('Unexpected error'));

            await expect(service.createAuth(payload)).rejects.toMatchObject({
                message: 'Account registration failed',
            });
            expect(authRepository.create).not.toHaveBeenCalled();
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalled();
        });
    });

    describe('login', () => {
        const authEntity: AuthEntity = {
            authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
            email: 'johndoe@email.com',
            username: 'johndoe',
            password: 'hashedPassword',
            status: AuthStatus.ACTIVE,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
            lastLogin: null,
            role: UserRole.USER,
        };
        it('should return login response with tokens and mapped auth', async () => {
            const tokens = {
                accessToken: { token: 'access-token', expiresIn: 3600 },
                refreshToken: { token: 'refresh-token', expiresIn: 7200 },
            };

            const expectedAuth = {
                authId: authEntity.authId,
                email: authEntity.email,
                status: authEntity.status,
                createdAt: authEntity.createdAt,
                updatedAt: authEntity.updatedAt,
                lastLogin: authEntity.lastLogin,
                username: authEntity.username,
                role: authEntity.role,
            };

            jwtService.generateTokens.mockResolvedValue(tokens);

            const result = await service.login(authEntity);

            expect(jwtService.generateTokens).toHaveBeenCalledWith({ email: authEntity.email, sub: authEntity.authId });
            expect(result).toEqual({ auth: expectedAuth, tokens });
        });
        it('should throw error if an unexpected error occurs', async () => {
            const unexpectedError = new Error('Unexpected error');
            jwtService.generateTokens.mockRejectedValue(unexpectedError);

            await expect(service.login(authEntity)).rejects.toMatchObject({ message: 'Login failed' });
            expect(jwtService.generateTokens).toHaveBeenCalledWith({ email: authEntity.email, sub: authEntity.authId });
        });
        it('should throw specific error if controlled error occurs', async () => {
            const controlledError = new BadRequestException('Bad Request');
            jwtService.generateTokens.mockRejectedValue(controlledError);

            await expect(service.login(authEntity)).rejects.toMatchObject({ message: 'Bad Request' });
            expect(jwtService.generateTokens).toHaveBeenCalledWith({ email: authEntity.email, sub: authEntity.authId });
        });
    });

    describe('logout', () => {
        const payload = {
            email: 'johndoe@email.com',
            sub: '123e4567-e89b-12d3-a456-426614174000' as UUID,
            iss: 'dodooo',
        };

        it('should return logout success message if token is revoked', async () => {
            jwtService.revokeRefreshToken.mockResolvedValue(true);
            const result = await service.logout(payload);
            expect(jwtService.revokeRefreshToken).toHaveBeenCalledWith(payload);
            expect(result).toEqual({ message: 'Logout successful' });
        });

        it('should throw BadRequestException if token is not revoked', async () => {
            jwtService.revokeRefreshToken.mockResolvedValue(false);
            await expect(service.logout(payload)).rejects.toMatchObject({ message: 'Access forbidden' });
            expect(jwtService.revokeRefreshToken).toHaveBeenCalledWith(payload);
        });

        it('should throw error if an unexpected error occurs', async () => {
            jwtService.revokeRefreshToken.mockRejectedValue(new Error('Unexpected error'));
            await expect(service.logout(payload)).rejects.toMatchObject({ message: 'An unexpected error occurred' });
            expect(jwtService.revokeRefreshToken).toHaveBeenCalledWith(payload);
        });
    });

    describe('refreshTokens', () => {
        const payload = {
            email: 'johndoe@email.com',
            sub: '123e4567-e89b-12d3-a456-426614174000' as UUID,
            iss: 'dodooo',
        };

        it('should return new tokens if refresh token is revoked', async () => {
            const tokens = {
                accessToken: { token: 'access-token', expiresIn: 3600 },
                refreshToken: { token: 'refresh-token', expiresIn: 7200 },
            };
            jwtService.revokeRefreshToken.mockResolvedValue(true);
            jwtService.generateTokens.mockResolvedValue(tokens);

            const result = await service.refreshTokens(payload);

            expect(jwtService.revokeRefreshToken).toHaveBeenCalledWith(payload);
            expect(jwtService.generateTokens).toHaveBeenCalledWith({ email: payload.email, sub: payload.sub });
            expect(result).toEqual({ tokens });
        });

        it('should throw BadRequestException if refresh token is not revoked', async () => {
            jwtService.revokeRefreshToken.mockResolvedValue(false);
            await expect(service.refreshTokens(payload)).rejects.toMatchObject({ message: 'Invalid refresh token' });
            expect(jwtService.revokeRefreshToken).toHaveBeenCalledWith(payload);
            expect(jwtService.generateTokens).not.toHaveBeenCalled();
        });

        it('should throw error if an unexpected error occurs', async () => {
            jwtService.revokeRefreshToken.mockRejectedValue(new Error('Unexpected error'));
            await expect(service.refreshTokens(payload)).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });
            expect(jwtService.revokeRefreshToken).toHaveBeenCalledWith(payload);
        });
    });

    describe('verifyEmail', () => {
        it('should verify email and return success message', async () => {
            // Arrange
            const authId = '123e4567-e89b-12d3-a456-426614174000';
            const username = 'testuser';
            const email = 'test@email.com';
            const expiredAt = Date.now() + 1000 * 60 * 60; // 1 hour from now
            const rawText = [authId, email, username, expiredAt].join(';');
            const token = EncryptionHelper.encode(rawText, 'aes-256-gcm', secretKeyConfig.emailVerificationSecret);

            authRepository.update.mockResolvedValue();
            mailerAuthService.sendWelcomeEmail.mockResolvedValue();

            // Act
            const result = await service.verifyEmail(token);

            // Assert
            expect(authRepository.update).toHaveBeenCalledWith({ authId, email }, { status: AuthStatus.ACTIVE });
            expect(mailerAuthService.sendWelcomeEmail).toHaveBeenCalledWith(email, username);
            expect(result).toEqual({ message: 'Email verified successfully' });
        });
        it('should throw BadRequest if token was expired', async () => {
            // Arrange
            const authId = '123e4567-e89b-12d3-a456-426614174000';
            const email = 'test@email.com';
            const username = 'testuser';
            const expiredAt = Date.now() - 1000 * 60 * 60; // 1 hour ago
            const rawText = [authId, email, username, expiredAt].join(';');
            const token = EncryptionHelper.encode(rawText, 'aes-256-gcm', secretKeyConfig.emailVerificationSecret);

            authRepository.update.mockResolvedValue();

            // Act
            await expect(service.verifyEmail(token)).rejects.toMatchObject({
                message: 'Email verification token has expired',
            });

            // Assert
            expect(authRepository.update).not.toHaveBeenCalled();
        });
        it('should throw Forbidden if authId is not valid', async () => {
            // Arrange
            const authId = '123e4567-e89b-12d3-a456-4266141700'; // Invalid UUID
            const username = 'testuser';
            const email = 'test@email.com';
            const expiredAt = Date.now() - 1000 * 60 * 60; // 1 hour ago
            const rawText = [authId, email, username, expiredAt].join(';');
            const token = EncryptionHelper.encode(rawText, 'aes-256-gcm', secretKeyConfig.emailVerificationSecret);

            authRepository.update.mockResolvedValue();

            // Act
            await expect(service.verifyEmail(token)).rejects.toMatchObject({
                message: 'Access forbidden',
            });

            // Assert
            expect(authRepository.update).not.toHaveBeenCalled();
        });
        it('should throw unexpected error if an unexpected error occurs', async () => {
            const token = 'invalid-token';

            authRepository.update.mockResolvedValue();

            // Act
            await expect(service.verifyEmail(token)).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });

            // Assert
            expect(authRepository.update).not.toHaveBeenCalled();
        });
    });
    describe('resendEmailVerification', () => {
        it('should resend email verification if token is valid and user exists', async () => {
            // Arrange
            const authId = '123e4567-e89b-12d3-a456-426614174000';
            const username = 'testuser';
            const email = 'test@email.com';
            const expiredAt = Date.now() - 1000 * 60 * 60; // 1 hour ago
            const rawText = [authId, email, username, expiredAt].join(';');
            const token = EncryptionHelper.encode(rawText, 'aes-256-gcm', secretKeyConfig.emailVerificationSecret);
            const authEntity: AuthEntity = {
                authId: authId as UUID,
                email,
                username,
                password: 'hashedPassword',
                status: AuthStatus.INACTIVE,
                role: UserRole.USER,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
            };
            authRepository.findOneBy.mockResolvedValue(authEntity);
            const createEmailVerificationTokenSpy = jest
                .spyOn<any, any>(service as any, 'createEmailVerificationToken')
                .mockResolvedValue(undefined);
            cachingAuthService.getTTLResendEmailVerify.mockResolvedValue(0);

            // Act
            const result = await service.resendEmailVerification(token);

            // Assert
            expect(authRepository.findOneBy).toHaveBeenCalledWith({ authId, email });
            expect(createEmailVerificationTokenSpy).toHaveBeenCalledWith(authEntity);
            expect(result).toEqual({ message: 'Email verified successfully' });
        });

        it('should throw BadRequestException if token is unexpired', async () => {
            // Arrange
            const authId = '123e4567-e89b-12d3-a456-426614174000';
            const email = 'test@email.com';
            const username = 'testuser';
            const expiredAt = Date.now() + 1000 * 60 * 60; // 1 hour ago
            const rawText = [authId, email, username, expiredAt].join(';');
            const token = EncryptionHelper.encode(rawText, 'aes-256-gcm', secretKeyConfig.emailVerificationSecret);
            const authEntity: AuthEntity = {
                authId: authId as UUID,
                email,
                username: 'testuser',
                password: 'hashedPassword',
                status: AuthStatus.INACTIVE,
                role: UserRole.USER,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
            };
            authRepository.findOneBy.mockResolvedValue(authEntity);

            // Act & Assert
            await expect(service.resendEmailVerification(token)).rejects.toMatchObject({
                message: 'Email verification token is still valid',
            });
        });

        it('should throw NotFoundException if user is not found', async () => {
            // Arrange
            const authId = '123e4567-e89b-12d3-a456-426614174000';
            const email = 'test@email.com';
            const username = 'testuser';
            const expiredAt = Date.now() - 1000 * 60 * 60; // 1 hour from now
            const rawText = [authId, email, username, expiredAt].join(';');
            const token = EncryptionHelper.encode(rawText, 'aes-256-gcm', secretKeyConfig.emailVerificationSecret);
            authRepository.findOneBy.mockResolvedValue(null);

            // Act & Assert
            await expect(service.resendEmailVerification(token)).rejects.toMatchObject({
                message: 'Account not found',
            });
        });

        it('throw BadRequest if time remaining for resending', async () => {
            // Arrange
            const authId = '123e4567-e89b-12d3-a456-426614174000';
            const email = 'test@email.com';
            const username = 'testuser';
            const expiredAt = Date.now() - 1000 * 60 * 60; // 1 hour ago
            const rawText = [authId, email, username, expiredAt].join(';');
            const token = EncryptionHelper.encode(rawText, 'aes-256-gcm', secretKeyConfig.emailVerificationSecret);
            const authEntity: AuthEntity = {
                authId: authId as UUID,
                email,
                username: 'testuser',
                password: 'hashedPassword',
                status: AuthStatus.INACTIVE,
                role: UserRole.USER,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
            };
            authRepository.findOneBy.mockResolvedValue(authEntity);
            cachingAuthService.getTTLResendEmailVerify.mockResolvedValue(1000 * 60 * 60); // 1 hour

            // Act
            await expect(service.resendEmailVerification(token)).rejects.toBeInstanceOf(BadRequestException);
            expect(authRepository.findOneBy).toHaveBeenCalledWith({ authId, email });
        });

        it('should throw BadRequestException or ForbiddenException if token is invalid', async () => {
            // Arrange
            const token = 'invalid-token';

            // Act & Assert
            await expect(service.resendEmailVerification(token)).rejects.toMatchObject({
                message: expect.stringMatching(/forbidden|unexpected|invalid/i),
            });
        });
    });

    describe('getAuthById', () => {
        const authId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
        const authEntity: AuthEntity = {
            authId,
            email: 'test@email.com',
            username: 'testuser',
            password: 'hashedPassword',
            status: AuthStatus.ACTIVE,
            role: UserRole.USER,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLogin: new Date(),
        };
        const { password, ...authDto } = authEntity;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return cached auth if present', async () => {
            cachingAuthService.getCachedAuth = jest.fn().mockResolvedValue(authEntity);
            const result = await service.getAuthById(authId);
            expect(cachingAuthService.getCachedAuth).toHaveBeenCalledWith(authId);
            expect(result).toEqual(authDto);
        });

        it('should return DB auth if not cached and cache it', async () => {
            cachingAuthService.getCachedAuth.mockResolvedValue(undefined);
            authRepository.findOneBy.mockResolvedValue(authEntity);
            cachingAuthService.cacheAuth.mockResolvedValue();

            const result = await service.getAuthById(authId);
            expect(authRepository.findOneBy).toHaveBeenCalledWith({ authId });
            expect(cachingAuthService.cacheAuth).toHaveBeenCalledWith(authId, authDto);
            expect(result).toEqual(authDto);
        });

        it('should throw NotFoundException if auth not found', async () => {
            cachingAuthService.getCachedAuth.mockResolvedValue(undefined);
            authRepository.findOneBy.mockResolvedValue(null);

            await expect(service.getAuthById(authId)).rejects.toMatchObject({
                message: 'Account not found',
            });
            expect(authRepository.findOneBy).toHaveBeenCalledWith({ authId });
        });

        it('should handle unexpected errors', async () => {
            const error = new Error('Unexpected error');
            cachingAuthService.getCachedAuth.mockRejectedValue(error);

            await expect(service.getAuthById(authId)).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });
        });
    });

    describe('getAuthByToken', () => {
        const validToken = 'valid.jwt.token';
        const authId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
        const mockPayload = {
            sub: authId,
            email: 'test@example.com',
            iss: 'test-issuer',
        };
        const mockAuthEntity: AuthEntity = {
            authId,
            email: 'test@example.com',
            username: 'testuser',
            password: 'hashedPassword',
            status: AuthStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLogin: new Date(),
            role: UserRole.USER,
        };

        it('should return auth DTO when token is valid and auth exists', async () => {
            jwtService.extractPayloadFromToken.mockResolvedValue(mockPayload);
            cachingAuthService.getCachedAuth.mockResolvedValue(null);
            authRepository.findOneBy.mockResolvedValue(mockAuthEntity);

            const result = await service.getAuthByToken(validToken);

            expect(jwtService.extractPayloadFromToken).toHaveBeenCalledWith(validToken);
            expect(result).toEqual({
                authId: mockAuthEntity.authId,
                email: mockAuthEntity.email,
                username: mockAuthEntity.username,
                status: mockAuthEntity.status,
                createdAt: mockAuthEntity.createdAt,
                updatedAt: mockAuthEntity.updatedAt,
                lastLogin: mockAuthEntity.lastLogin,
                role: mockAuthEntity.role,
            });
        });

        it('should throw BadRequestException when token extraction fails', async () => {
            jwtService.extractPayloadFromToken.mockRejectedValue(new Error('Invalid token'));

            await expect(service.getAuthByToken(validToken)).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });

            expect(jwtService.extractPayloadFromToken).toHaveBeenCalledWith(validToken);
        });

        it('should throw BadRequestException when payload is null', async () => {
            jwtService.extractPayloadFromToken.mockResolvedValue(null);

            await expect(service.getAuthByToken(validToken)).rejects.toThrow(BadRequestException);

            expect(jwtService.extractPayloadFromToken).toHaveBeenCalledWith(validToken);
        });

        it('should throw BadRequestException when payload is missing sub', async () => {
            const invalidPayload = {
                email: 'test@example.com',
                iss: 'test-issuer',
            };
            jwtService.extractPayloadFromToken.mockResolvedValue(invalidPayload);

            await expect(service.getAuthByToken(validToken)).rejects.toThrow(BadRequestException);

            expect(jwtService.extractPayloadFromToken).toHaveBeenCalledWith(validToken);
        });

        it('should throw BadRequestException when payload is missing email', async () => {
            const invalidPayload = {
                sub: authId,
                iss: 'test-issuer',
            };
            jwtService.extractPayloadFromToken.mockResolvedValue(invalidPayload);

            await expect(service.getAuthByToken(validToken)).rejects.toThrow(BadRequestException);

            expect(jwtService.extractPayloadFromToken).toHaveBeenCalledWith(validToken);
        });

        it('should handle error when getAuthById fails', async () => {
            jwtService.extractPayloadFromToken.mockResolvedValue(mockPayload);
            cachingAuthService.getCachedAuth.mockResolvedValue(null);
            authRepository.findOneBy.mockRejectedValue(new Error('Database error'));

            await expect(service.getAuthByToken(validToken)).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });

            expect(jwtService.extractPayloadFromToken).toHaveBeenCalledWith(validToken);
        });
    });

    describe('validateTokenResponse', () => {
        const mockToken = 'valid-token';
        const mockCorrelationId = 'test-correlation-id';
        const mockReplyTo = 'test-reply-to';
        const mockAuthResponse = {
            authId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
            email: 'test@example.com',
            username: 'testuser',
            status: AuthStatus.ACTIVE,
            role: UserRole.USER,
        };

        beforeEach(() => {
            clientProxy.send.mockReturnValue({
                toPromise: jest.fn().mockResolvedValue(undefined),
            });
        });

        it('should successfully validate token and send success response', async () => {
            // Arrange
            jest.spyOn(service, 'getAuthByToken').mockResolvedValue(mockAuthResponse);
            const expectedResponse = {
                isValid: true,
                auth: mockAuthResponse,
                correlationId: mockCorrelationId,
            };

            // Act
            await service.validateTokenResponse(mockToken, mockCorrelationId, mockReplyTo);

            // Assert
            expect(service.getAuthByToken).toHaveBeenCalledWith(mockToken);
            expect(clientProxy.send).toHaveBeenCalledWith(mockReplyTo, expectedResponse);
            expect(clientProxy.send().toPromise).toHaveBeenCalled();
        });

        it('should send error response when token validation fails', async () => {
            // Arrange
            const mockError = new Error('Token validation failed');
            jest.spyOn(service, 'getAuthByToken').mockRejectedValue(mockError);
            const expectedErrorResponse = {
                isValid: false,
                auth: null,
                correlationId: mockCorrelationId,
                error: mockError.message,
            };

            // Act & Assert
            await expect(
                service.validateTokenResponse(mockToken, mockCorrelationId, mockReplyTo),
            ).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });

            expect(service.getAuthByToken).toHaveBeenCalledWith(mockToken);
            expect(clientProxy.send).toHaveBeenCalledWith(mockReplyTo, expectedErrorResponse);
            expect(clientProxy.send().toPromise).toHaveBeenCalled();
        });

        it('should handle BadRequestException and send appropriate error response', async () => {
            // Arrange
            const badRequestError = new BadRequestException('Invalid token format');
            jest.spyOn(service, 'getAuthByToken').mockRejectedValue(badRequestError);
            const expectedErrorResponse = {
                isValid: false,
                auth: null,
                correlationId: mockCorrelationId,
                error: badRequestError.message,
            };

            // Act & Assert
            await expect(
                service.validateTokenResponse(mockToken, mockCorrelationId, mockReplyTo),
            ).rejects.toMatchObject({
                message: 'Invalid token format',
            });

            expect(service.getAuthByToken).toHaveBeenCalledWith(mockToken);
            expect(clientProxy.send).toHaveBeenCalledWith(mockReplyTo, expectedErrorResponse);
        });

        it('should handle client proxy send failure', async () => {
            // Arrange
            jest.spyOn(service, 'getAuthByToken').mockResolvedValue(mockAuthResponse);
            const clientError = new Error('Client proxy send failed');
            clientProxy.send.mockReturnValue({
                toPromise: jest.fn().mockRejectedValue(clientError),
            });

            // Act & Assert
            await expect(service.validateTokenResponse(mockToken, mockCorrelationId, mockReplyTo)).rejects.toThrow(
                clientError,
            );

            expect(service.getAuthByToken).toHaveBeenCalledWith(mockToken);
            expect(clientProxy.send).toHaveBeenCalledWith(mockReplyTo, {
                isValid: true,
                auth: mockAuthResponse,
                correlationId: mockCorrelationId,
            });
        });

        it('should handle null auth response', async () => {
            // Arrange
            jest.spyOn(service, 'getAuthByToken').mockResolvedValue({} as any);
            const expectedResponse = {
                isValid: true,
                auth: {},
                correlationId: mockCorrelationId,
            };

            // Act
            await service.validateTokenResponse(mockToken, mockCorrelationId, mockReplyTo);

            // Assert
            expect(service.getAuthByToken).toHaveBeenCalledWith(mockToken);
            expect(clientProxy.send).toHaveBeenCalledWith(mockReplyTo, expectedResponse);
        });

        it('should handle partial auth response', async () => {
            // Arrange
            const partialAuthResponse = {
                email: 'test@example.com',
                username: 'testuser',
            };
            jest.spyOn(service, 'getAuthByToken').mockResolvedValue(partialAuthResponse);
            const expectedResponse = {
                isValid: true,
                auth: partialAuthResponse,
                correlationId: mockCorrelationId,
            };

            // Act
            await service.validateTokenResponse(mockToken, mockCorrelationId, mockReplyTo);

            // Assert
            expect(service.getAuthByToken).toHaveBeenCalledWith(mockToken);
            expect(clientProxy.send).toHaveBeenCalledWith(mockReplyTo, expectedResponse);
        });

        it('should handle empty token string', async () => {
            // Arrange
            const emptyToken = '';
            const mockError = new Error('Empty token provided');
            jest.spyOn(service, 'getAuthByToken').mockRejectedValue(mockError);
            const expectedErrorResponse = {
                isValid: false,
                auth: null,
                correlationId: mockCorrelationId,
                error: mockError.message,
            };

            // Act & Assert
            await expect(
                service.validateTokenResponse(emptyToken, mockCorrelationId, mockReplyTo),
            ).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });

            expect(service.getAuthByToken).toHaveBeenCalledWith(emptyToken);
            expect(clientProxy.send).toHaveBeenCalledWith(mockReplyTo, expectedErrorResponse);
        });

        it('should preserve correlation ID in both success and error responses', async () => {
            // Test success case
            jest.spyOn(service, 'getAuthByToken').mockResolvedValue(mockAuthResponse);

            await service.validateTokenResponse(mockToken, mockCorrelationId, mockReplyTo);

            expect(clientProxy.send).toHaveBeenCalledWith(
                mockReplyTo,
                expect.objectContaining({
                    correlationId: mockCorrelationId,
                }),
            );

            // Reset mocks
            jest.clearAllMocks();
            clientProxy.send.mockReturnValue({
                toPromise: jest.fn().mockResolvedValue(undefined),
            });

            // Test error case
            const mockError = new Error('Test error');
            jest.spyOn(service, 'getAuthByToken').mockRejectedValue(mockError);

            await expect(service.validateTokenResponse(mockToken, mockCorrelationId, mockReplyTo)).rejects.toThrow();

            expect(clientProxy.send).toHaveBeenCalledWith(
                mockReplyTo,
                expect.objectContaining({
                    correlationId: mockCorrelationId,
                }),
            );
        });

        it('should log errors properly', async () => {
            // Arrange
            const mockError = new Error('Test error for logging');
            jest.spyOn(service, 'getAuthByToken').mockRejectedValue(mockError);
            const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

            // Act
            await expect(service.validateTokenResponse(mockToken, mockCorrelationId, mockReplyTo)).rejects.toThrow();

            // Assert
            expect(loggerErrorSpy).toHaveBeenCalledWith('Error validating token response:', mockError);
        });
    });
});
