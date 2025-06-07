import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig, jwtConfig, rabbitMQConfig } from './configs/configuration.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { RmqModule } from './modules/rmq/rmq.module';
import { UserModule } from './modules/user/user.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: (process.env.NODE_ENV || 'development') === 'development' ? '.env.dev' : '.env',
            load: [databaseConfig, jwtConfig, rabbitMQConfig],
        }),
        DatabaseModule,
        AuthModule,
        UserModule,
        RmqModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
