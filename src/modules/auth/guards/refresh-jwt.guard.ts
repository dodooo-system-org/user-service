import { AUTH_REFRESH_TOKEN_NAME } from '@src/constants';

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RefreshJwtAuthGuard extends AuthGuard(AUTH_REFRESH_TOKEN_NAME) {
    constructor() {
        super({
            property: 'refreshJwt',
        });
    }
}
