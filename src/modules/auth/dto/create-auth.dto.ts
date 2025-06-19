import { AUTH_MESSAGES, REGEX_PATTERNS } from '@src/constants';
import { IsEmail, IsNotEmpty, Matches, MaxLength, MinLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateAuthDto {
    @ApiProperty({
        name: 'username',
        description: 'User unique username',
        example: 'johndoe',
        required: true,
        type: String,
        minLength: 3,
        maxLength: 32,
    })
    @Matches(/^[a-zA-Z0-9_]+$/, { message: AUTH_MESSAGES.VALIDATION.USERNAME_INVALID })
    @MinLength(3, { message: AUTH_MESSAGES.VALIDATION.USERNAME_MIN_LENGTH })
    @MaxLength(32, { message: AUTH_MESSAGES.VALIDATION.USERNAME_MAX_LENGTH })
    @IsNotEmpty({ message: AUTH_MESSAGES.VALIDATION.USERNAME_REQUIRED })
    username: string;

    @ApiProperty({
        name: 'email',
        description: 'User email address',
        example: 'johndoe@email.com',
        required: true,
        type: String,
    })
    @IsEmail({}, { message: AUTH_MESSAGES.VALIDATION.EMAIL_INVALID })
    @IsNotEmpty({ message: AUTH_MESSAGES.VALIDATION.EMAIL_REQUIRED })
    email: string;

    @ApiProperty({
        name: 'password',
        description: 'User password',
        example: 'StrongPassword123!',
        required: true,
        type: String,
        pattern: REGEX_PATTERNS.PASSWORD.source,
    })
    @Matches(REGEX_PATTERNS.PASSWORD, { message: AUTH_MESSAGES.VALIDATION.PASSWORD_WEAK })
    @MinLength(8, { message: AUTH_MESSAGES.VALIDATION.PASSWORD_MIN_LENGTH })
    @MaxLength(64, { message: AUTH_MESSAGES.VALIDATION.PASSWORD_MAX_LENGTH })
    @IsNotEmpty({ message: AUTH_MESSAGES.VALIDATION.PASSWORD_REQUIRED })
    password: string;
}
