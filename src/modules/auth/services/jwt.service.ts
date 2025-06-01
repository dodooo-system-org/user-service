import { JwtConfig, jwtConfig } from '@configs/configuration.config';
import { ErrorHelper } from '@helpers/error.helper';
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

    constructor(@Inject() private readonly jwtRepository: JwtRepository) {
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

            // Save the refresh token to the database
            await this.jwtRepository.save({
                jwtId: refreshToken.jwtId,
                auth: {
                    authId: payload.sub,
                },
                expiresAt: new Date(Date.now() + refreshToken.expiresIn),
            } as JWTEntity);

            return {
                accessToken: tokenResponseToDtoMapper(accessToken),
                refreshToken: tokenResponseToDtoMapper(refreshToken),
            };
        } catch (error) {
            this.myLogger.error('Error generating tokens:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }

    // public async validateAccessToken(token: string): Promise<JwtPayload> {
    //     try {
    //         return await this.verifyAsync(token, { secret: this.jwtConfig.secret });
    //     } catch (error) {
    //         this.myLogger.error('Error generating tokens:', error);
    //         throw ErrorHelper.generateErrorService(error);
    //     }
    // }

    // public async validateRefreshToken(token: string) {}

    async revokeRefreshToken(payload: JwtPayload): Promise<boolean> {
        try {
            if (!payload?.jwtId) {
                throw new MethodNotAllowedException(JWT_MESSAGES.ERROR.NOT_ALLOWED);
            }

            // Delete the refresh token from the database
            const result = await this.jwtRepository.delete({ jwtId: payload.jwtId, auth: { authId: payload.sub } });
            return !!result?.affected && result.affected > 0;
        } catch (error) {
            this.myLogger.error('Error revoking refresh token:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }
}
