import { COMMON_MESSAGES } from '@src/constants';
import { UserRole } from '@src/database/entities';
import { Roles } from '@src/decorators';
import { RequestJwtDto } from '@src/modules/auth/dto';
import { AuthService } from '@src/modules/auth/services';

import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Inject() private readonly authService: AuthService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const roles = this.reflector.get(Roles, context.getHandler());
        if (!roles) {
            return true;
        }
        const request: RequestJwtDto = context.switchToHttp().getRequest();
        const auth = request.user;
        if (!auth || !auth.authId) {
            throw new UnauthorizedException(COMMON_MESSAGES.ERROR.UNAUTHORIZED);
        }
        const authDto = await this.authService.getAuthById(auth.authId);

        const isMatched = matchRoles(roles, authDto.role || UserRole.USER);
        if (!isMatched) {
            throw new UnauthorizedException(COMMON_MESSAGES.ERROR.UNAUTHORIZED);
        }
        return true;
    }
}

function matchRoles(roles: string[], userRole: string) {
    if (roles.includes(userRole)) {
        return true;
    }
    return false;
}
