import { HttpException, InternalServerErrorException } from '@nestjs/common';

export class ErrorHelper {
    static generateErrorService(error: any, message?: string) {
        if (error instanceof HttpException) {
            return error;
        } else {
            return new InternalServerErrorException({
                message: message || 'An unexpected error occurred',
            });
        }
    }
}
