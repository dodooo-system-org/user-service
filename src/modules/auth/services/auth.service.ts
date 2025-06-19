import { AuthEntity, AuthStatus } from '@database/entities';
import { AuthHelper } from '@helpers/auth.helper';
import { ErrorHelper } from '@helpers/error.helper';
import { AUTH_MESSAGES } from '@src/constants';
import { DataSource } from 'typeorm';

import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';

import { UserService } from '../../user/user.service';
import { CreateAuthDto, JwtPayload, LoginBodyDto, LoginResponseDto } from '../dto';
import { authEntityToDtoMapper } from '../mappers';
import { AuthRepository } from '../repositories';
import { JwtService } from './jwt.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly authRepository: AuthRepository,
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly dataSource: DataSource,
    ) {}

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

    async validateJwtAuth(payload: JwtPayload): Promise<AuthEntity> {
        try {
            const auth = await this.authRepository.findOneBy({ authId: payload.sub, email: payload.email });

            if (!auth) {
                throw new NotFoundException(AUTH_MESSAGES.ERROR.ACCOUNT_NOT_FOUND);
            }

            const checkBlockedAuth = this.checkBlockedAuth(auth);
            if (checkBlockedAuth) {
                throw checkBlockedAuth;
            }
            return auth;
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
                throw new BadRequestException(AUTH_MESSAGES.ERROR.INVALID_CREDENTIALS);
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
}
