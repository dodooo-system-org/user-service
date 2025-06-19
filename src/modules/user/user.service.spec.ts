import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UserRepository } from './repositories';
import { UserService } from './user.service';

describe('UserService', () => {
    let service: UserService;
    let userRepository: any;
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: UserRepository,
                    useValue: {
                        create: jest.fn(),
                        saveUser: jest.fn(),
                        createUserWithValidation: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        userRepository = module.get<UserRepository>(UserRepository);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createUser', () => {
        const payload = {
            firstName: 'John',
            lastName: 'Doe',
            midName: 'M',
            phone: '1234567890',
            identityNumber: '12345678901',
            birthday: '1990-01-01',
            avatar: 'avatar.png',
            authId: '550e8400-e29b-41d4-a716-446655440000',
        };

        it('should create a user successfully', async () => {
            const { authId, ...payloadWithoutAuthId } = payload;

            const userEntity = {
                userId: '6c7308a7-4dd1-4615-9095-52e66665cc38',
                auth: { authId: authId },
                createdAt: new Date(),
                updatedAt: new Date(),
                ...payloadWithoutAuthId,
            };
            userRepository.create.mockReturnValue(userEntity);
            userRepository.saveUser.mockResolvedValue(userEntity);

            const result = await service.createUser(payload as any);

            expect(userRepository.create).toHaveBeenCalledWith({
                auth: { authId: authId },
                ...payloadWithoutAuthId,
            });
            expect(userRepository.saveUser).toHaveBeenCalledWith(userEntity);
            expect(result).toEqual(userEntity);
        });

        it('throw an error when user creation fails', async () => {
            const { authId, ...payloadWithoutAuthId } = payload;
            const userEntity = {
                userId: '6c7308a7-4dd1-4615-9095-52e66665cc38',
                auth: { authId: authId },
                createdAt: new Date(),
                updatedAt: new Date(),
                ...payloadWithoutAuthId,
            };
            const error = new Error('DB error');
            userRepository.create.mockReturnValue(userEntity);
            userRepository.saveUser.mockRejectedValue(error);

            await expect(service.createUser(payload as any)).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });
            expect(userRepository.create).toHaveBeenCalledWith({
                auth: { authId: authId },
                ...payloadWithoutAuthId,
            });
            expect(userRepository.saveUser).toHaveBeenCalledWith(userEntity);
        });

        it('throw an error when duplicate phone number exists', async () => {
            const { authId, ...payloadWithoutAuthId } = payload;

            const userEntity = {
                userId: '6c7308a7-4dd1-4615-9095-52e66665cc38',
                auth: { authId: authId },
                createdAt: new Date(),
                updatedAt: new Date(),
                ...payloadWithoutAuthId,
            };
            const error = new BadRequestException('Phone number already exist');
            userRepository.create.mockReturnValue(userEntity);
            userRepository.saveUser.mockRejectedValue(error);

            await expect(service.createUser(payload as any)).rejects.toMatchObject({
                message: 'Phone number already exist',
            });
            expect(userRepository.create).toHaveBeenCalledWith({
                auth: { authId: authId },
                ...payloadWithoutAuthId,
            });
            expect(userRepository.saveUser).toHaveBeenCalledWith(userEntity);
        });

        it('throw an error when duplicate identify number exists', async () => {
            const { authId, ...payloadWithoutAuthId } = payload;

            const userEntity = {
                userId: '6c7308a7-4dd1-4615-9095-52e66665cc38',
                auth: { authId: authId },
                createdAt: new Date(),
                updatedAt: new Date(),
                ...payloadWithoutAuthId,
            };
            const error = new BadRequestException('Identity number already exists');
            userRepository.create.mockReturnValue(userEntity);
            userRepository.saveUser.mockRejectedValue(error);

            await expect(service.createUser(payload as any)).rejects.toMatchObject({
                message: 'Identity number already exists',
            });
            expect(userRepository.create).toHaveBeenCalledWith({
                auth: { authId: authId },
                ...payloadWithoutAuthId,
            });
            expect(userRepository.saveUser).toHaveBeenCalledWith(userEntity);
        });
    });

    describe('createUserWithTransaction', () => {
        const payload = {
            firstName: 'John',
            lastName: 'Doe',
            midName: 'M',
            phone: '1234567890',
            identityNumber: '12345678901',
            birthday: '1990-01-01',
            avatar: 'avatar.png',
            authId: '550e8400-e29b-41d4-a716-446655440000',
        };

        let queryRunner = {
            manager: {
                save: jest.fn(),
            },
        };

        it('create a user with transaction successfully', async () => {
            const { authId, ...payloadWithoutAuthId } = payload;

            const userEntity = {
                userId: '6c7308a7-4dd1-4615-9095-52e66665cc38',
                auth: { authId: authId },
                createdAt: new Date(),
                updatedAt: new Date(),
                ...payloadWithoutAuthId,
            };

            userRepository.createUserWithValidation.mockResolvedValue(userEntity);
            queryRunner.manager.save.mockResolvedValue(userEntity);

            const result = await service.createUserWithTransaction(payload as any, queryRunner as any);

            expect(userRepository.createUserWithValidation).toHaveBeenCalledWith({
                auth: { authId: authId },
                ...payloadWithoutAuthId,
            });
            expect(queryRunner.manager.save).toHaveBeenCalledWith(userEntity);
            expect(result).toEqual(userEntity);
        });

        it('throw error while creating a user failed by createUserWithTransaction', async () => {
            const { authId, ...payloadWithoutAuthId } = payload;

            const error = new Error('DB error');
            userRepository.createUserWithValidation.mockRejectedValue(error);

            await expect(service.createUserWithTransaction(payload as any, queryRunner as any)).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });

            expect(userRepository.createUserWithValidation).toHaveBeenCalledWith({
                auth: { authId: authId },
                ...payloadWithoutAuthId,
            });
        });

        it('throw error while creating a user failed by queryRunner.manage.save', async () => {
            const { authId, ...payloadWithoutAuthId } = payload;

            const userEntity = {
                userId: '6c7308a7-4dd1-4615-9095-52e66665cc38',
                auth: { authId: authId },
                createdAt: new Date(),
                updatedAt: new Date(),
                ...payloadWithoutAuthId,
            };

            const error = new Error('DB error');
            userRepository.createUserWithValidation.mockResolvedValue(userEntity);
            queryRunner.manager.save.mockRejectedValue(error);

            await expect(service.createUserWithTransaction(payload as any, queryRunner as any)).rejects.toMatchObject({
                message: 'An unexpected error occurred',
            });

            expect(userRepository.createUserWithValidation).toHaveBeenCalledWith({
                auth: { authId: authId },
                ...payloadWithoutAuthId,
            });
            expect(queryRunner.manager.save).toHaveBeenCalledWith(userEntity);
        });

        it('throw an error when duplicate phone number exists in transaction', async () => {
            const { authId, ...payloadWithoutAuthId } = payload;

            const error = new BadRequestException('Phone number already exists');
            userRepository.createUserWithValidation.mockRejectedValue(error);

            await expect(service.createUserWithTransaction(payload as any, queryRunner as any)).rejects.toMatchObject({
                message: 'Phone number already exists',
            });

            expect(userRepository.createUserWithValidation).toHaveBeenCalledWith({
                auth: { authId: authId },
                ...payloadWithoutAuthId,
            });
        });

        it('throw an error when duplicate identify number exists in transaction', async () => {
            const { authId, ...payloadWithoutAuthId } = payload;

            const error = new BadRequestException('Identity number already exists');
            userRepository.createUserWithValidation.mockRejectedValue(error);

            await expect(service.createUserWithTransaction(payload as any, queryRunner as any)).rejects.toMatchObject({
                message: 'Identity number already exists',
            });

            expect(userRepository.createUserWithValidation).toHaveBeenCalledWith({
                auth: { authId: authId },
                ...payloadWithoutAuthId,
            });
        });
    });
});
