import { SecuritySchemeObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const AUTH_OPTIONS: SecuritySchemeObject = {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Bearer',
    description: 'JWT authentication scheme. Use the token obtained from the login endpoint.',
};

export const AUTH_TOKEN_NAME = 'access-token';

export const AUTH_REFRESH_TOKEN_NAME = 'refresh-token';
