import { MailerService } from '@nestjs-modules/mailer';
import { AppContentConfig } from '@src/configs/configuration.config';
import { MAILER_MESSAGES } from '@src/constants/messages/mailer.message';
import { ErrorHelper } from '@src/helpers';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerAuthService {
    private readonly logger = new Logger(MailerAuthService.name);
    private readonly appContentConfig: AppContentConfig;

    constructor(
        @Inject() private readonly mailerService: MailerService,
        @Inject() private readonly configService: ConfigService,
    ) {
        this.appContentConfig = this.configService.get<AppContentConfig>('appcontent_env') as AppContentConfig;
    }

    async sendEmailVerification(email: string, username: string, token: string): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to: email,
                subject: 'Email Verification',
                template: 'email-verification',
                context: {
                    token,
                    username,
                    ...this.appContentConfig,
                },
            });
            this.logger.log(`Email verification sent to ${email}`);
        } catch (error) {
            this.logger.error('Error sending email verification:', error);
            throw ErrorHelper.generateErrorService(error, MAILER_MESSAGES.MAILER_AUTH.ERROR.EMAIL_VERIFICATION);
        }
    }

    // async sendPasswordReset(email: string, token: string): Promise<void> {
    //     try {
    //         await this.mailerService.sendMail({
    //             to: email,
    //             subject: 'Password Reset Request',
    //             template: 'password-reset',
    //             context: {
    //                 token,
    //             },
    //         });
    //         this.logger.log(`Password reset email sent to ${email}`);
    //     } catch (error) {
    //         this.logger.error('Error sending password reset email:', error);
    //         throw ErrorHelper.generateErrorService(error)
    //     }
    // }

    async sendWelcomeEmail(email: string, username: string): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to: email,
                subject: `Welcome to ${this.appContentConfig.appName}!!`,
                template: 'welcome',
                context: {
                    username,
                },
            });
            this.logger.log(`Welcome email sent to ${email}`);
        } catch (error) {
            this.logger.error('Error sending welcome email:', error);
            throw ErrorHelper.generateErrorService(error);
        }
    }
}
