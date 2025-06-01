import { AuthEntity, JWTEntity } from '@src/database/entities';

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthRepository, JwtRepository } from './repositories';
import { AuthService } from './services/auth.service';
import { JwtService } from './services/jwt.service';
import { LocalStrategy } from './strategies';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';

@Module({
    imports: [TypeOrmModule.forFeature([AuthEntity, JWTEntity]), UserModule, PassportModule],
    controllers: [AuthController],
    providers: [AuthService, JwtService, AuthRepository, JwtRepository, LocalStrategy, JwtStrategy, RefreshJwtStrategy],
})
export class AuthModule {}
