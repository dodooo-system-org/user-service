import { jwtConfig } from '@src/configs/configuration.config';
import { AUTH_REFRESH_TOKEN_NAME } from '@src/constants';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { JwtPayload } from '../dto';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, AUTH_REFRESH_TOKEN_NAME) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    const token = req.cookies?.['refreshToken'] as string | undefined;
                    if (!token) {
                        return null;
                    }
                    return token;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: jwtConfig().secret,
            passReqToCallback: true,
        });
    }

    validate(req: Request, payload: JwtPayload, done: (...args) => void): void {
        done(null, payload);
    }
}
