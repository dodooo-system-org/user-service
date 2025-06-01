import { AuthEntity } from '@src/database/entities';
import { Request } from 'express';

import { JwtPayload } from './jwt-payload.dto';

export interface RequestJwtDto extends Request {
    user: AuthEntity;
}

export interface RequestRefreshJwtDto extends Request {
    refreshJwt: JwtPayload;
}
