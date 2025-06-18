import { rabbitMQConfig } from '@src/configs/configuration.config';

import { Inject, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientsModule, Transport } from '@nestjs/microservices';

export const RABBITMQ_NAME = 'RABBITMQ_SERVICE';

@Module({
    imports: [
        ClientsModule.registerAsync({
            clients: [
                {
                    name: RABBITMQ_NAME,
                    useFactory: () => ({
                        transport: Transport.RMQ,
                        options: rabbitMQConfig(),
                    }),
                },
            ],
        }),
    ],
})
export class RmqModule implements OnModuleInit {
    private logger = new Logger(RmqModule.name);
    constructor(@Inject(RABBITMQ_NAME) private readonly rabbitMQClient: ClientProxy) {}
    async onModuleInit() {
        try {
            await this.rabbitMQClient.connect();
            this.logger.log('RabbitMQ client connected successfully');
        } catch (error) {
            this.logger.error('Error connecting to RabbitMQ:', error);
        }
    }
}
