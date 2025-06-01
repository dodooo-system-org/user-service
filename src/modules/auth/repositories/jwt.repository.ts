import { JWTEntity } from '@src/database/entities';
import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class JwtRepository extends Repository<JWTEntity> {
    constructor(
        @InjectRepository(JWTEntity)
        private readonly repository: Repository<JWTEntity>,
    ) {
        super(repository.target, repository.manager, repository.queryRunner);
    }
}
