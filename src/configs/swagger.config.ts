import { AUTH_OPTIONS, AUTH_TOKEN_NAME, COMMON_MESSAGES } from '@src/constants';

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function SwaggerConfiguration(app: INestApplication) {
    const config = new DocumentBuilder()
        .setTitle('Smart surveillance example')
        .setDescription('The Smart surveillance API description')
        .setVersion('1.0')
        .addTag('smart-surveillance')
        .addBearerAuth(AUTH_OPTIONS, AUTH_TOKEN_NAME)
        .addGlobalResponse({
            status: 500,
            description: COMMON_MESSAGES.ERROR.INTERNAL_SERVER_ERROR,
        })
        .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory);
}
