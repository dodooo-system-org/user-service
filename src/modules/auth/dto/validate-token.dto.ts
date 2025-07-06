import { AUTH_MESSAGES } from '@src/constants';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ValidateTokenDto {
    @IsString({ message: AUTH_MESSAGES.VALIDATION.TOKEN_INVALID_TYPE })
    @IsNotEmpty({ message: AUTH_MESSAGES.VALIDATION.TOKEN_REQUIRED })
    readonly token: string;

    @IsUUID('all', { message: AUTH_MESSAGES.VALIDATION.REQUEST_ID_INVALID_TYPE })
    @IsNotEmpty({ message: AUTH_MESSAGES.VALIDATION.REQUEST_ID_REQUIRED })
    readonly correlationId: string;

    @IsOptional()
    readonly timestamp?: number;
}
