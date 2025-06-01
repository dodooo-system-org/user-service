import { UserEntity } from '@src/database/entities';
import { ErrorHelper } from '@src/helpers/error.helper';
import { UUID } from 'crypto';
import { QueryRunner } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';

import { CreateUserDto } from './dto';
import { UserRepository } from './repositories';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);
    constructor(private readonly userRepository: UserRepository) {}

    public async createUser(payload: CreateUserDto): Promise<UserEntity> {
        try {
            const userEntity = this.userRepository.create({
                auth: {
                    authId: payload.authId as UUID,
                },
            });
            return await this.userRepository.saveUser(userEntity);
        } catch (error) {
            this.logger.error(`Error creating user: ${error}`);
            throw ErrorHelper.generateErrorService(error);
        }
    }

    public async createUserWithTransaction(payload: CreateUserDto, queryRunner: QueryRunner): Promise<UserEntity> {
        try {
            const userEntity = this.userRepository.create({
                auth: {
                    authId: payload.authId as UUID,
                },
            });
            const newUser = await queryRunner.manager.save(userEntity);
            return newUser;
        } catch (error) {
            this.logger.error(`Error creating user with transaction: ${error}`);
            throw ErrorHelper.generateErrorService(error);
        }
    }
}
