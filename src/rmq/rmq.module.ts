import { RabbitMQConfig } from '@src/configs/configuration.config';

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

export const COMMON_RMQ = 'COMMON_RMQ';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: COMMON_RMQ,
                useFactory: (configService: ConfigService) => {
                    const rmqConfig = configService.get<RabbitMQConfig>('rabbitmq_env');
                    return {
                        transport: Transport.RMQ,
                        options: {
                            urls: rmqConfig?.urls,
                            // Configure for topic exchange
                            exchange: 'amq.topic',
                            exchangeType: 'topic',
                            wildcards: true,
                            serializer: {
                                serialize: (value: any) => {
                                    return Buffer.from(JSON.stringify(value.data), 'utf-8');
                                },
                            },
                        },
                    };
                },
            },
        ]),
    ],
    exports: [ClientsModule],
})
export class RmqModule {}
