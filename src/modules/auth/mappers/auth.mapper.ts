import { AuthEntity } from '@src/database/entities';

import { AuthResponseDto } from '../dto/auth-response.dto';

export const authEntityToDtoMapper = (entity: AuthEntity): AuthResponseDto => {
    const dto: AuthResponseDto = {
        authId: entity.authId,
        email: entity.email,
        status: entity.status,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        lastLogin: entity.lastLogin,
        username: entity.username,
    };

    return dto;
};
