import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CachingModule } from './caching/caching.module';
import { cacheConfig, databaseConfig, jwtConfig, rabbitMQConfig } from './configs/configuration.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RmqModule } from './rmq/rmq.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: (process.env.NODE_ENV || 'development') === 'development' ? '.env.dev' : '.env',
            load: [databaseConfig, jwtConfig, rabbitMQConfig, cacheConfig],
        }),
        DatabaseModule,
        AuthModule,
        UserModule,
        RmqModule,
        CachingModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
