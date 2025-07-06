import * as cookieParser from 'cookie-parser';
import { upperCase } from 'lodash';
import * as morgan from 'morgan';

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';
import { RabbitMQConfig } from './configs/configuration.config';
import { SwaggerConfiguration } from './configs/swagger.config';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
    const logger = new Logger(bootstrap.name);
    try {
        logger.verbose('Environment: ' + upperCase(process.env.NODE_ENV));

        const app = await NestFactory.create(AppModule, {
            bodyParser: true,
            rawBody: true,
        });

        const configService = new ConfigService();
        const rabbitMQConfig = configService.get<RabbitMQConfig>('rabbitmq_env');

        const microservice = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
            transport: Transport.RMQ,
            options: {
                urls: rabbitMQConfig?.urls,
                queue: rabbitMQConfig?.queue,
                queueOptions: {
                    durable: true,
                },
                exchange: 'amq.topic',
                exchangeType: 'topic',
                routingKey: 'user.*.*',
                wildcards: true,
                prefetchCount: 1,
            },
        });

        app.useGlobalPipes(
            new ValidationPipe({
                stopAtFirstError: true,
            }),
        );
        app.useGlobalFilters(new HttpExceptionFilter());

        app.use(cookieParser());
        app.use(morgan('dev'));

        SwaggerConfiguration(app);

        // Start all microservices
        await microservice.listen();
        // Then start the HTTP server
        await app.listen(process.env.SERVICE_PORT || 3000);
        logger.log(`User service is running on port: ${process.env.SERVICE_PORT || 3000}`);
    } catch (error) {
        logger.error('Error during bootstrap:', error);
        process.exit(1);
    }
}
bootstrap()
    .then(() => {
        const logger = new Logger('Bootstrap');
        logger.log('User service has been successfully initialized.');
    })
    .catch((error) => {
        const logger = new Logger('Bootstrap');
        logger.error('Error during bootstrap:', error);
        process.exit(1);
    });
