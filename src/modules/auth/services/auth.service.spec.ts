import { AuthEntity, AuthStatus, UserEntity } from '@src/database/entities';
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
    let dataSource: any;
    let userService: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: AuthRepository,
                    useValue: {
                        findOneByEmail: jest.fn(),
                        findOneBy: jest.fn(),
                        existByEmail: jest.fn(),
                        existByUsername: jest.fn(),
                        create: jest.fn(),
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
                    useValue: {},
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
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        authRepository = module.get<AuthRepository>(AuthRepository);
        dataSource = module.get<DataSource>(DataSource);
        userService = module.get<UserService>(UserService);

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

            authRepository.findOneBy.mockResolvedValue(authEntity);

            const result = await service.validateJwtAuth(payload);

            expect(result).toEqual(authEntity);
            expect(authRepository.findOneBy).toHaveBeenCalledWith({ authId: payload.sub, email: payload.email });
        });
        it('should throw NotFoundException if auth not found', async () => {
            const payload = {
                email: 'johndoe@email.com',
                sub: '123e4567-e89b-12d3-a456-426614174000' as UUID,
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
            expect(result).toEqual({ message: 'Account registered successfully' });
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
});
