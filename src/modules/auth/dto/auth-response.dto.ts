import { AuthEntity } from '@src/database/entities';

import { OmitType } from '@nestjs/mapped-types';

import { TokenResponse } from './jwt-payload.dto';

export class AuthResponseDto extends OmitType(AuthEntity, ['password'] as const) {}

export class LoginResponseDto {
    auth: AuthResponseDto;
    tokens: {
        accessToken: TokenResponse;
        refreshToken: TokenResponse;
    };
}
