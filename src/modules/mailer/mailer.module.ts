import { MailerModule as MailerModuleLib, MailerService as MailerServiceLib } from '@nestjs-modules/mailer';
import { MailerConfig } from '@src/configs/configuration.config';

import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
    imports: [
        MailerModuleLib.forRootAsync({
            useFactory: (configService: ConfigService) => {
                const mailerConfig = configService.get<MailerConfig>('mailer_env');
                return {
                    transport: {
                        service: mailerConfig?.service,
                        auth: {
                            type: mailerConfig?.auth?.type,
                            user: mailerConfig?.auth?.user,
                            clientId: mailerConfig?.auth?.clientId,
                            clientSecret: mailerConfig?.auth?.clientSecret,
                        },
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
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
            await this.mailService.verifyAllTransporters();

            this.logger.log('Mail server connection verified successfully');
        } catch (error) {
            this.logger.error('Mail server connection verification failed', error);
        }
    }
}
