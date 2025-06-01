import * as cookieParser from 'cookie-parser';
import { upperCase } from 'lodash';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { SwaggerConfiguration } from './configs/swagger.config';

async function bootstrap() {
    const logger = new Logger(bootstrap.name);
    try {
        const app = await NestFactory.create(AppModule, {
            bodyParser: true,
            rawBody: true,
        });

        app.useGlobalPipes(
            new ValidationPipe({
                stopAtFirstError: true,
            }),
        );

        app.use(cookieParser());

        SwaggerConfiguration(app);

        await app.listen(process.env.SERVICE_PORT ?? 3000);

        logger.verbose('Environment: ' + upperCase(process.env.NODE_ENV));
        logger.verbose(`User service is running on port ${process.env.SERVICE_PORT ?? 3000}`);
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
