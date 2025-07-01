import * as cookieParser from 'cookie-parser';
import { upperCase } from 'lodash';
import * as morgan from 'morgan';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, RmqStatus, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';
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

        app.useGlobalPipes(
            new ValidationPipe({
                stopAtFirstError: true,
            }),
        );
        app.useGlobalFilters(new HttpExceptionFilter());

        app.use(cookieParser());
        app.use(morgan('dev'));

        SwaggerConfiguration(app);

        // Configure RabbitMQ microservice for receiving messages
        app.connectMicroservice<MicroserviceOptions>({
            transport: Transport.RMQ,
            options: {
                urls: ['amqp://guest:guest@localhost:5672'],
                queue: 'user_service_queue',
                queueOptions: {
                    durable: false,
                },
            },
        });

        // Start all microservices first
        await app.startAllMicroservices();
        logger.log('Microservices started successfully');

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
