import { ConfigService, registerAs } from '@nestjs/config';

export interface DatabaseConfig {
    type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize?: boolean;
    autoloadEntities?: boolean;
}

export const databaseConfig = registerAs('database_env', (): DatabaseConfig => {
    const configService = new ConfigService();
    return {
        type: configService.get<string>('DATABASE_TYPE', 'postgres'),
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get<string>('DATABASE_USERNAME', 'postgres'),
        password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
        database: configService.get<string>('DATABASE_NAME', 'postgres'),
        synchronize: configService.get<boolean>('DATABASE_SYNCHRONIZE', false),
        autoloadEntities: configService.get<boolean>('DATABASE_AUTOLOAD_ENTITIES', false),
    };
});

export interface JwtConfig {
    secret: string;
    jwtAccessTokenExpiresIn: string;
    jwtRefreshTokenExpiresIn: string;
}

export const jwtConfig = registerAs('jwt_env', (): JwtConfig => {
    const configService = new ConfigService();
    return {
        secret: configService.get<string>('JWT_SECRET', 'defaultSecretKey'),
        jwtAccessTokenExpiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN', '1h'),
        jwtRefreshTokenExpiresIn: configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN', '7d'),
    };
});

export interface RabbitMQConfig {
    urls: string[];
    queue: string;
    queueOptions: {
        durable: boolean;
    };
}

export const rabbitMQConfig = registerAs('rabbitmq_env', (): RabbitMQConfig => {
    const configService = new ConfigService();
    return {
        urls: configService.get<string>('RABBITMQ_URLS')?.split(',') || ['amqp://localhost'],
        queue: configService.get<string>('RABBITMQ_QUEUE_NAME') || 'default_queue',
        queueOptions: {
            durable: configService.get<boolean>('RABBITMQ_QUEUE_DURABLE', false),
        },
    };
});

export interface CacheConfig {
    host: string;
    port: number;
    username?: string; // Optional for Redis
    password: string;
    ttl: number; // Time to live in seconds
}

export const cacheConfig = registerAs('cache_env', (): CacheConfig => {
    const configService = new ConfigService();
    return {
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        username: configService.get<string>('REDIS_USERNAME', ''), // Optional for Redis
        password: configService.get<string>('REDIS_PASSWORD', ''),
        ttl: configService.get<number>('REDIS_TTL', 3600), // Default TTL is 1 hour
    };
});
