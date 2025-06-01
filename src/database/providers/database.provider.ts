import { databaseConfig } from '@configs/configuration.config';
import { AuthEntity, JWTEntity, UserEntity } from '@database/entities';

import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseProvider = TypeOrmModule.forRootAsync({
    useFactory: (): TypeOrmModuleOptions => {
        const config = databaseConfig();
        return {
            type: (config.type || 'postgres') as 'postgres',
            host: config.host,
            port: config.port,
            username: config.username,
            password: config.password,
            database: config.database,
            synchronize: config.synchronize, // Synchronize the database schema
            autoLoadEntities: config.autoloadEntities, // Automatically load entities
            entities: [AuthEntity, UserEntity, JWTEntity],
        };
    },
});
