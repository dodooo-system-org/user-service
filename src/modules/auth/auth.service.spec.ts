import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from './services/auth.service';
import { AuthRepository } from './repositories';
import { UserService } from '../user/user.service';
import { JwtService } from './services';
import { DataSource } from 'typeorm';

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AuthService, 
                {
                    provide: AuthRepository,
                    useValue: {}
                },
                {
                    provide: UserService,
                    useValue: {}
                },
                {
                    provide: JwtService,
                    useValue: {}
                },
                {
                    provide: DataSource,
                    useValue: {}
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
