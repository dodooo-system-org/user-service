import { USER_MESSAGES } from '@src/constants';
import { UserEntity } from '@src/database/entities';
import { Repository } from 'typeorm';

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserRepository extends Repository<UserEntity> {
    constructor(@InjectRepository(UserEntity) private readonly repository: Repository<UserEntity>) {
        super(repository.target, repository.manager, repository.queryRunner);
    }

    existPhoneNumber(phoneNumber: string): Promise<boolean> {
        return this.repository.existsBy({ phone: phoneNumber });
    }

    existIdentityNumber(identityNumber: string): Promise<boolean> {
        return this.repository.existsBy({ identityNumber: identityNumber });
    }

    async saveUser(payload: UserEntity): Promise<UserEntity> {
        const isExistedIdentityNumber =
            payload.identityNumber && (await this.repository.existsBy({ identityNumber: payload.identityNumber }));
        if (isExistedIdentityNumber) {
            throw new BadRequestException(USER_MESSAGES.ERROR.IDENTITY_NUMBER_EXISTS);
        }

        const isExistedPhoneNumber = payload.phone && (await this.repository.existsBy({ phone: payload.phone }));
        if (isExistedPhoneNumber) {
            throw new BadRequestException(USER_MESSAGES.ERROR.PHONE_NUMBER_EXISTS);
        }

        return await this.repository.save(payload);
    }
}
