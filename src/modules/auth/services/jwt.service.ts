import { JwtConfig, jwtConfig } from '@configs/configuration.config';
import { ErrorHelper } from '@helpers/error.helper';
import { CachingJwtService } from '@src/caching/services';
import { JWT_MESSAGES } from '@src/constants/messages/jwt.messages';
import { JWTEntity } from '@src/database/entities';
import { randomUUID } from 'crypto';
import * as ms from 'ms';

import { Inject, Injectable, Logger, MethodNotAllowedException } from '@nestjs/common';
import { JwtService as BaseJwtService } from '@nestjs/jwt';

import { JwtPayload, TokenResponse } from '../dto';
import { tokenResponseToDtoMapper } from '../mappers';
import { JwtRepository } from '../repositories';

@Injectable()
export class JwtService extends BaseJwtService {
    private readonly myLogger = new Logger(JwtService.name);
    private readonly jwtConfig: JwtConfig = jwtConfig();

    constructor(
        @Inject() private readonly jwtRepository: JwtRepository,
        @Inject() private readonly cachingJwtService: CachingJwtService,
    ) {
        super();
    }

    private async generateAccessToken(payload: JwtPayload): Promise<TokenResponse> {
        const expiresIn = this.jwtConfig.jwtAccessTokenExpiresIn;

        const token = await this.signAsync(payload, {
            secret: this.jwtConfig.secret,
            expiresIn,
        });

        return {
            token,
            expiresIn: ms(expiresIn as ms.StringValue),
        };
    }

    private async generateRefreshToken(payload: JwtPayload): Promise<TokenResponse> {
        const expiresIn = this.jwtConfig.jwtRefreshTokenExpiresIn;
        const jwtId = randomUUID();
        // Create a clean payload without any existing exp, iat, or other JWT claims
        const cleanPayload = {
            sub: payload.sub,
            email: payload.email,
            jwtId,
        };
        const token = await this.signAsync(cleanPayload, {
            expiresIn: this.jwtConfig.jwtRefreshTokenExpiresIn,
            secret: this.jwtConfig.secret,
        });

        return {
            jwtId,
            token,
            expiresIn: ms(expiresIn as ms.StringValue),
        };
    }

    public async generateTokens(
        payload: Pick<JwtPayload, 'sub' | 'email'>,
    ): Promise<{ accessToken: TokenResponse; refreshToken: TokenResponse }> {
        try {
            const accessToken = await this.generateAccessToken(payload);
            const refreshToken = await this.generateRefreshToken(payload);

            // Store the refresh token in the cache and database
            const promiseActions: Promise<any>[] = [];
            // Cache the refresh token for quick access
            promiseActions.push(this.cachingJwtService.set(payload.sub, refreshToken.jwtId as string));
            // Save the refresh token to the database
            promiseActions.push(
                this.jwtRepository.save({
                    jwtId: refreshToken.jwtId,
                    auth: {
                        authId: payload.sub,
                    },
                    expiresAt: new Date(Date.now() + refreshToken.expiresIn),
                } as JWTEntity),
            );

            await Promise.all(promiseActions);

            return {
                accessToken: tokenResponseToDtoMapper(accessToken),
                refreshToken: tokenResponseToDtoMapper(refreshToken),
            };
        } catch (error) {
            this.myLogger.error('Error generating tokens:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }

    async revokeRefreshToken(payload: JwtPayload): Promise<boolean> {
        try {
            if (!payload?.jwtId) {
                throw new MethodNotAllowedException(JWT_MESSAGES.ERROR.NOT_ALLOWED);
            }

            // Check if the refresh token exists in the cache
            const isExisted = await this.cachingJwtService.delete(payload.sub, payload.jwtId as string);
            if (isExisted) {
                // If the token was found on the cache, delete it from the database
                this.jwtRepository.delete({ jwtId: payload.jwtId, auth: { authId: payload.sub } });
                return true;
            }

            // If the token was not found in the cache, try to delete it from the database
            const dbResult = await this.jwtRepository.delete({ jwtId: payload.jwtId, auth: { authId: payload.sub } });
            return !!dbResult?.affected && dbResult?.affected > 0;
        } catch (error) {
            this.myLogger.error('Error revoking refresh token:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }
}
