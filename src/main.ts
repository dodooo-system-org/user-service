import * as cookieParser from 'cookie-parser';
import { upperCase } from 'lodash';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';
import { rabbitMQConfig } from './configs/configuration.config';
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

        SwaggerConfiguration(app);

        const microservice = app.connectMicroservice({
            transport: Transport.RMQ,
            options: rabbitMQConfig(),
        });

        await app.listen(process.env.SERVICE_PORT || 3000);
        logger.log(`User service is running on port: ${process.env.SERVICE_PORT || 3000}`);

        // Start the microservice
        await app.startAllMicroservices();
        await microservice.listen();
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
