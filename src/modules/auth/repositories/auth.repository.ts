import { AuthEntity } from '@src/database/entities';
import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AuthRepository extends Repository<AuthEntity> {
    constructor(
        @InjectRepository(AuthEntity)
        private readonly repository: Repository<AuthEntity>,
    ) {
        super(repository.target, repository.manager, repository.queryRunner);
    }

    existByEmail(email: string): Promise<boolean> {
        return this.repository.existsBy({ email: email });
    }

    existByUsername(username: string): Promise<boolean> {
        return this.repository.existsBy({ username: username });
    }

    async findOneByEmail(email: string): Promise<AuthEntity | null> {
        if (!email) {
            return null;
        }
        return await this.repository.findOne({
            where: {
                email: email,
            },
        });
    }
}
