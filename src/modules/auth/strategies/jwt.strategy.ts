import { jwtConfig } from '@src/configs/configuration.config';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { JwtPayload } from '../dto';
import { authEntityToDtoMapper } from '../mappers';
import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConfig().secret,
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: JwtPayload, done: (...args) => void): Promise<void> {
        const auth = await this.authService.validateJwtAuth(payload);
        done(null, authEntityToDtoMapper(auth));
    }
}
