import { AuthEntity, AuthStatus } from '@database/entities';
import { AuthHelper } from '@helpers/auth.helper';
import { ErrorHelper } from '@helpers/error.helper';
import { CachingAuthService } from '@src/caching/services/caching.auth.service';
import { SecretKeyConfig } from '@src/configs/configuration.config';
import { AUTH_MESSAGES } from '@src/constants';
import { EncryptionHelper } from '@src/helpers/encryption.helper';
import { MailerAuthService } from '@src/modules/mailer/services';
import { isUUID } from 'class-validator';
import { UUID } from 'crypto';
import { DataSource } from 'typeorm';

import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';

import { UserService } from '../../user/user.service';
import { AuthResponseDto, CreateAuthDto, JwtPayload, LoginBodyDto, LoginResponseDto } from '../dto';
import { authEntityToDtoMapper } from '../mappers';
import { AuthRepository } from '../repositories';
import { JwtService } from './jwt.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly verifiedTokenExpirationTimeMs = 1000 * 60 * 60; // 1 hour
    private readonly secretKeyConfig: SecretKeyConfig;

    constructor(
        private readonly authRepository: AuthRepository,
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly dataSource: DataSource,
        private readonly mailerAuthService: MailerAuthService,
        private readonly cachingAuthService: CachingAuthService,
        private readonly configService: ConfigService,
    ) {
        this.secretKeyConfig = this.configService.get<SecretKeyConfig>('secretkey_env') as SecretKeyConfig;
    }

    private async createEmailVerificationToken(auth: Pick<AuthEntity, 'authId' | 'email' | 'username'>): Promise<void> {
        try {
            if (!auth) {
                throw new BadRequestException(AUTH_MESSAGES.ERROR.EMAIL_VERIFICATION_FAILED);
            }

            const token = this.stringifyEmailVerificationToken(auth);
            if (!token) {
                throw new BadRequestException(AUTH_MESSAGES.ERROR.EMAIL_VERIFICATION_FAILED);
            }
            await this.mailerAuthService.sendEmailVerification(auth.email, auth.username, token);
            await this.cachingAuthService.cachingResendEmailVerify(auth.authId, this.verifiedTokenExpirationTimeMs);
        } catch (error) {
            this.logger.error('Error creating email verification token:', error);
            throw error;
        }
    }

    private stringifyEmailVerificationToken(auth: Pick<AuthEntity, 'authId' | 'email' | 'username'>): string {
        const expiredAt = Date.now() + this.verifiedTokenExpirationTimeMs;
        const rawText = [auth.authId, auth.email, auth.username, expiredAt].join(';');
        return EncryptionHelper.encode(rawText, 'aes-256-gcm', this.secretKeyConfig.emailVerificationSecret);
    }

    private parseEmailVerificationToken(token: string): string[] {
        const decodedToken = EncryptionHelper.decode(
            token,
            'aes-256-gcm',
            this.secretKeyConfig.emailVerificationSecret,
        );
        if (!decodedToken) {
            throw new BadRequestException(AUTH_MESSAGES.ERROR.FORBIDDEN);
        }
        const parts = decodedToken.split(';');
        if (parts.length !== 4 || !isUUID(parts[0])) {
            throw new BadRequestException(AUTH_MESSAGES.ERROR.FORBIDDEN);
        }
        return parts;
    }

    protected checkBlockedAuth(auth: AuthEntity): HttpException | null {
        if (auth?.status === AuthStatus.SUSPENDED) {
            return new ForbiddenException(AUTH_MESSAGES.ERROR.ACCOUNT_SUSPENDED);
        } else if (auth?.status === AuthStatus.DELETED) {
            return new NotFoundException(AUTH_MESSAGES.ERROR.ACCOUNT_NOT_FOUND);
        } else if (auth?.status === AuthStatus.INACTIVE) {
            return new NotFoundException(AUTH_MESSAGES.ERROR.ACCOUNT_INACTIVE);
        } else {
            return null;
        }
    }

    async validateLocalAuth({ email, password }: LoginBodyDto) {
        try {
            const auth = await this.authRepository.findOneByEmail(email);
            if (!auth) {
                throw new NotFoundException(AUTH_MESSAGES.ERROR.ACCOUNT_NOT_FOUND);
            }

            const checkBlockedAuth = this.checkBlockedAuth(auth);
            if (checkBlockedAuth) {
                throw checkBlockedAuth;
            }

            const isPasswordValid = await AuthHelper.compareHashedText(password, auth.password);
            if (!isPasswordValid) {
                throw new BadRequestException(AUTH_MESSAGES.ERROR.INVALID_CREDENTIALS);
            }

            return auth;
        } catch (error) {
            this.logger.error('Error validating auth:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }

    async validateJwtAuth(payload: JwtPayload): Promise<Partial<AuthEntity>> {
        try {
            const auth = await this.authRepository.findOneBy({ authId: payload.sub, email: payload.email });

            if (!auth) {
                throw new NotFoundException(AUTH_MESSAGES.ERROR.ACCOUNT_NOT_FOUND);
            }

            const checkBlockedAuth = this.checkBlockedAuth(auth);
            if (checkBlockedAuth) {
                throw checkBlockedAuth;
            }
            return authEntityToDtoMapper(auth);
        } catch (error) {
            this.logger.error('Error validating jwt auth:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }

    async createAuth({ email, password, username }: CreateAuthDto): Promise<{ message: string }> {
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();
            await queryRunner.startTransaction();

            const existEmail = await this.authRepository.existByEmail(email);
            if (existEmail) {
                throw new BadRequestException(AUTH_MESSAGES.ERROR.EMAIL_ALREADY_EXISTS);
            }
            const existUsername = await this.authRepository.existByUsername(username);
            if (existUsername) {
                throw new BadRequestException(AUTH_MESSAGES.ERROR.USERNAME_ALREADY_EXISTS);
            }

            const hashedPassword = await AuthHelper.hashText(password);

            const authEntity = this.authRepository.create({
                email,
                password: hashedPassword,
                username: username,
            });

            await queryRunner.manager.save(authEntity);
            await this.userService.createUserWithTransaction({ authId: authEntity.authId }, queryRunner);

            // Create email verification token after successful registration
            await this.createEmailVerificationToken(authEntity);

            await queryRunner.commitTransaction();

            return { message: AUTH_MESSAGES.SUCCESS.REGISTRATION_SUCCESS };
        } catch (error) {
            this.logger.error('Error creating auth:', error);
            await queryRunner.rollbackTransaction();
            throw ErrorHelper.generateErrorService(error, AUTH_MESSAGES.ERROR.ACCOUNT_REGISTRATION_FAILED);
        } finally {
            await queryRunner.release();
        }
    }

    // Only used in local strategy
    async login(auth: AuthEntity): Promise<LoginResponseDto> {
        try {
            const tokens = await this.jwtService.generateTokens({ email: auth.email, sub: auth.authId });

            return {
                auth: authEntityToDtoMapper(auth),
                tokens,
            };
        } catch (error) {
            this.logger.error('Error login:', error);
            throw ErrorHelper.generateErrorService(error, AUTH_MESSAGES.ERROR.LOGIN_FAILED);
        }
    }

    async logout(payload: JwtPayload) {
        try {
            const isRevoked = await this.jwtService.revokeRefreshToken(payload);
            if (!isRevoked) {
                throw new ForbiddenException(AUTH_MESSAGES.ERROR.FORBIDDEN);
            }
            return { message: AUTH_MESSAGES.SUCCESS.LOGOUT_SUCCESS };
        } catch (error) {
            this.logger.error('Error logout:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }

    async refreshTokens(payload: JwtPayload): Promise<Pick<LoginResponseDto, 'tokens'>> {
        try {
            const isRevoked = await this.jwtService.revokeRefreshToken(payload);
            if (!isRevoked) {
                throw new BadRequestException(AUTH_MESSAGES.ERROR.REFRESH_TOKEN_INVALID);
            }
            const tokens = await this.jwtService.generateTokens({
                email: payload.email,
                sub: payload.sub,
            });
            return {
                tokens,
            };
        } catch (error) {
            this.logger.error('Error refreshing tokens:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }

    async verifyEmail(token: string) {
        try {
            const [authId, email, username, expiredAt] = this.parseEmailVerificationToken(token);

            if (Date.now() > Number(expiredAt)) {
                throw new BadRequestException(AUTH_MESSAGES.ERROR.EMAIL_VERIFICATION_TOKEN_EXPIRED);
            }
            if (!authId || !email || !username || !isUUID(authId)) {
                throw new ForbiddenException(AUTH_MESSAGES.ERROR.FORBIDDEN);
            }
            await this.authRepository.update({ authId: authId as UUID, email }, { status: AuthStatus.ACTIVE });
            this.mailerAuthService.sendWelcomeEmail(email, username);
            return { message: AUTH_MESSAGES.SUCCESS.EMAIL_VERIFIED };
        } catch (error) {
            this.logger.error('Error verifying email:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }

    async resendEmailVerification(token: string) {
        try {
            const [authId, email, _, expiredAt] = this.parseEmailVerificationToken(token);
            if (Date.now() < Number(expiredAt)) {
                throw new BadRequestException(AUTH_MESSAGES.ERROR.EMAIL_VERIFICATION_TOKEN_UNEXPIRED);
            }
            const auth = await this.authRepository.findOneBy({ authId: authId as UUID, email });
            if (!auth) {
                throw new NotFoundException(AUTH_MESSAGES.ERROR.ACCOUNT_NOT_FOUND);
            }
            const timeRemaining = await this.cachingAuthService.getTTLResendEmailVerify(auth.authId);
            if (timeRemaining > 0) {
                throw new BadRequestException(`Please wait for ${timeRemaining} seconds`);
            }

            await this.createEmailVerificationToken(auth);
            return { message: AUTH_MESSAGES.SUCCESS.EMAIL_VERIFIED };
        } catch (error) {
            this.logger.error('Error resending email verification:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }

    async getAuthById(authId: UUID): Promise<Partial<AuthResponseDto>> {
        try {
            // Try caching first
            const cachedAuth = await this.cachingAuthService.getCachedAuth(authId);
            if (cachedAuth) {
                return authEntityToDtoMapper(cachedAuth as AuthEntity);
            }

            // If not cached, fetch from database
            const auth = await this.authRepository.findOneBy({ authId });
            if (!auth) {
                throw new NotFoundException(AUTH_MESSAGES.ERROR.ACCOUNT_NOT_FOUND);
            }

            // Caching the auth data without synchronously
            const authDto = authEntityToDtoMapper(auth);
            this.cachingAuthService.cacheAuth(auth.authId, authDto);

            return authDto;
        } catch (error) {
            this.logger.error('Error getting auth by ID:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }

    async getAuthByToken(token: string): Promise<Partial<AuthResponseDto>> {
        try {
            const payload = await this.jwtService.extractPayloadFromToken(token);
            if (!payload || !payload.sub || !payload.email) {
                throw new BadRequestException(AUTH_MESSAGES.ERROR.INVALID_TOKEN);
            }
            return this.getAuthById(payload.sub);
        } catch (error) {
            this.logger.error('Error getting auth by token:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }
    async validateTokenResponse(token: string, context: RmqContext): Promise<void> {
        try {
            console.log({ token, context });
        } catch (error) {
            this.logger.error('Error validating token response:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }
}
