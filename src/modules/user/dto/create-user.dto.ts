import { REGEX_PATTERNS, VALIDATION_MESSAGES } from '@src/constants';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateUserDto {
    @IsString({ message: VALIDATION_MESSAGES.MUST_BE_STRING('First name') })
    @IsOptional()
    firstName?: string;

    @IsString({ message: VALIDATION_MESSAGES.MUST_BE_STRING('Last name') })
    @IsOptional()
    lastName?: string;

    @IsString({ message: VALIDATION_MESSAGES.MUST_BE_STRING('Middle name') })
    @IsOptional()
    midName?: string;

    @Matches(REGEX_PATTERNS.PHONE, { message: VALIDATION_MESSAGES.INVALID_PHONE })
    @IsOptional()
    phone?: string;

    @IsString({ message: VALIDATION_MESSAGES.MUST_BE_STRING('Identity number') })
    @IsOptional()
    identityNumber?: string;

    @IsString({ message: VALIDATION_MESSAGES.MUST_BE_STRING('Birthday') })
    @IsOptional()
    birthday?: Date;

    @IsString({ message: VALIDATION_MESSAGES.MUST_BE_STRING('Avatar') })
    @IsOptional()
    avatar?: string;

    @IsUUID('4', { message: VALIDATION_MESSAGES.INVALID_UUID })
    @IsNotEmpty()
    authId: string;
}
