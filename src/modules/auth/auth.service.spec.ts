import { DataSource } from 'typeorm';

import { Test, TestingModule } from '@nestjs/testing';

import { UserService } from '../user/user.service';
import { AuthRepository } from './repositories';
import { JwtService } from './services';
import { AuthService } from './services/auth.service';

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: AuthRepository,
                    useValue: {},
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
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
