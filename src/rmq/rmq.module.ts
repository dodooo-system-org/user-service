import { RabbitMQConfig, rabbitMQConfig } from '@src/configs/configuration.config';

import { Inject, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientsModule, Transport } from '@nestjs/microservices';

export const RABBITMQ_NAME = 'RABBITMQ_SERVICE';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: RABBITMQ_NAME,
                transport: Transport.RMQ,
                options: {
                    urls: ['amqp://localhost:guest@localhost:5672'],
                    queue: 'user_service_queue',
                    queueOptions: {
                        durable: false,
                    },
                },
            },
        ]),
    ],
    // exports: [RABBITMQ_NAME],
})
export class RmqModule implements OnModuleInit {
    private logger = new Logger(RmqModule.name);

    async onModuleInit() {
        this.logger.log('RabbitMQ module initialized - microservice configuration handled in main.ts');
    }
}
