import { MailerModule as MailerModuleLib, MailerService as MailerServiceLib } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { AppContentConfig, MailerConfig } from '@src/configs/configuration.config';
import { join } from 'path';

import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MailerAuthService } from './services';

@Module({
    imports: [
        MailerModuleLib.forRootAsync({
            useFactory: (configService: ConfigService) => {
                const mailerConfig = configService.get<MailerConfig>('mailer_env');
                const appContent = configService.get<AppContentConfig>('appcontent_env');
                console.log(mailerConfig);
                return {
                    transport: {
                        service: mailerConfig?.service,
                        host: mailerConfig?.host,
                        port: mailerConfig?.port,
                        secure: mailerConfig?.secure, // true for 465, false for other ports
                        auth: {
                            user: mailerConfig?.auth?.user,
                            pass: mailerConfig?.auth?.pass,
                        },
                    },
                    defaults: {
                        from: `"${appContent?.appName}!" <${mailerConfig?.auth?.user}>`,
                    },
                    template: {
                        dir: join(process.cwd(), 'templates'),
                        adapter: new HandlebarsAdapter(),
                        options: {
                            strict: true,
                        },
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    providers: [MailerAuthService],
    exports: [MailerAuthService],
})
export class MailerModule implements OnModuleInit {
    private readonly logger = new Logger(MailerModule.name);

    constructor(private readonly mailService: MailerServiceLib) {}

    async onModuleInit(): Promise<void> {
        await this.verifyConnection();
    }

    private async verifyConnection(): Promise<void> {
        try {
            // Verify the connection using the transporter
            const result = await this.mailService.verifyAllTransporters();
            if (!result) {
                this.logger.error('No mail transporters available');
            }

            this.logger.log('Mail server connection verified successfully');
        } catch (error) {
            this.logger.error('Mail server connection verification failed', error);
        }
    }
}
