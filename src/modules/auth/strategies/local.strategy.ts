import { validate as classValidate } from 'class-validator';
import { Strategy } from 'passport-local';

import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { LoginBodyDto } from '../dto';
import { AuthService } from '../services/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({
            usernameField: 'email',
            passwordField: 'password',
        });
    }

    async validate(email: string, password: string, done: (...args) => void) {
        const loginBody = new LoginBodyDto();
        loginBody.email = email;
        loginBody.password = password;

        classValidate(loginBody)
            .then((errors) => {
                if (errors.length > 0) {
                    done(new BadRequestException('Invalid login credentials'), false);
                }
            })
            .catch(() => {
                done(new BadRequestException('Validation error'), false);
            });

        const auth = await this.authService.validateLocalAuth({ email, password });
        done(null, auth);
    }
}
