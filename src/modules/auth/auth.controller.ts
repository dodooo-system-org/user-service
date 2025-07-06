import { AUTH_TOKEN_NAME } from '@src/constants';
import { Response } from 'express';

import { Body, Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateAuthDto, LoginBodyDto, RequestJwtDto, RequestRefreshJwtDto } from './dto';
import { ValidateTokenDto } from './dto/validate-token.dto';
import { LocalAuthGuard } from './guards';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt.guard';
import { AuthService } from './services/auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @ApiOperation({
        summary: 'Register a new user account',
        description:
            'Creates a new user account with email and password. The email must be unique and password must meet security requirements.',
    })
    @Post('')
    registerAccount(@Body() createAuthDto: CreateAuthDto) {
        return this.authService.createAuth(createAuthDto);
    }

    @ApiOperation({
        summary: 'User login',
        description: 'Logs in a user with email and password. Returns an access token if successful.',
    })
    @ApiBody({
        type: LoginBodyDto,
    })
    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Req() req: RequestJwtDto, @Res({ passthrough: true }) res: Response) {
        const response = await this.authService.login(req?.user);
        res.cookie('refreshToken', response.tokens.refreshToken.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: response.tokens.refreshToken.expiresIn,
        });
        return response;
    }

    @ApiOperation({
        summary: 'User logout',
        description:
            'Logs out the currently authenticated user. Requires a valid JWT token. Clears the refresh token cookie and invalidates the current session.',
    })
    @ApiBearerAuth(AUTH_TOKEN_NAME)
    @UseGuards(JwtAuthGuard)
    @UseGuards(RefreshJwtAuthGuard)
    @Delete('logout')
    async logout(@Req() req: RequestRefreshJwtDto, @Res({ passthrough: true }) res: Response) {
        const isLoggedOut = await this.authService.logout(req?.refreshJwt);
        if (isLoggedOut) {
            res.clearCookie('refreshToken');
        }
        return { message: 'Successfully logged out' };
    }

    @Post('refresh')
    @UseGuards(RefreshJwtAuthGuard)
    @ApiOperation({
        summary: 'Refresh access token',
        description: 'Refreshes the access token using a valid refresh token. Requires a valid refresh token cookie.',
    })
    async refreshAccessToken(@Req() req: RequestRefreshJwtDto, @Res({ passthrough: true }) res: Response) {
        const response = await this.authService.refreshTokens(req?.refreshJwt);
        res.cookie('refreshToken', response.tokens.refreshToken.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: response.tokens.refreshToken.expiresIn,
        });
        return response;
    }

    @ApiOperation({
        summary: 'Verify user email',
        description: "Verifies a user's email address using the provided verification token.",
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                token: { type: 'string', description: 'Email verification token' },
            },
            required: ['token'],
        },
    })
    @Post('verify-email')
    verifyEmail(@Body('token') token: string) {
        return this.authService.verifyEmail(token);
    }

    @ApiOperation({
        summary: 'Resend email verification',
        description: 'Resends the email verification link to the user using the provided token.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                token: { type: 'string', description: 'User token to identify the account' },
            },
            required: ['token'],
        },
    })
    @Post('resend-email-verify')
    resendEmailVerify(@Body('token') token: string) {
        return this.authService.resendEmailVerification(token);
    }

    // @MessagePattern('user.auth.validate-token')
    // async validateTokenRequest(@Payload() data: ValidateTokenDto, @Ctx() context: RmqContext) {
    //     const { correlationId, replyTo } = context.getArgs()[0].properties;
    //     console.log(data);
    //     // await this.authService.validateTokenResponse(data.token, correlationId, replyTo);
    //     // console.dir(context.getArgs()[0]);
    // }

    // @Get('test-rabbitmq-communication')
    // async testRabbitMQCommunication() {
    //     return this.authService.sendMessageToRabbitMQ();
    // }
}
