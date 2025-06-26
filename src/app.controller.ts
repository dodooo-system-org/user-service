import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { AppService } from './app.service';
import { AUTH_TOKEN_NAME } from './constants';
import { UserRole } from './database/entities';
import { Roles } from './decorators';
import { RolesGuard } from './guards';
import { JwtAuthGuard } from './modules/auth/guards/jwt.guard';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @ApiBearerAuth(AUTH_TOKEN_NAME)
    @Roles([UserRole.USER])
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Get()
    getHello(): string {
        return this.appService.getHello();
    }
}
