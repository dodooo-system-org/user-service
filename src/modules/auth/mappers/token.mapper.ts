import { TokenResponse } from '../dto';

export const tokenResponseToDtoMapper = (entity: TokenResponse): Omit<TokenResponse, 'jwtId'> => {
    const dto: Omit<TokenResponse, 'jwtId'> = {
        token: entity.token,
        expiresIn: entity.expiresIn,
    };

    return dto;
};
