import { Logger } from '@nestjs/common';
import { ConfigService, registerAs } from '@nestjs/config';

const logger = new Logger('Configuration');

function getRequiredEnv<T>(configService: ConfigService, key: string): T {
    const value = configService.get<T>(key);
    if (value === undefined || value === null || value === '') {
        logger.error(`Missing required environment variable: ${key}`);
        throw new Error('Error in environment configuration: ' + key);
    }
    return value;
}

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
        type: getRequiredEnv<string>(configService, 'DATABASE_TYPE'),
        host: getRequiredEnv<string>(configService, 'DATABASE_HOST'),
        port: getRequiredEnv<number>(configService, 'DATABASE_PORT'),
        username: getRequiredEnv<string>(configService, 'DATABASE_USERNAME'),
        password: getRequiredEnv<string>(configService, 'DATABASE_PASSWORD'),
        database: getRequiredEnv<string>(configService, 'DATABASE_NAME'),
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
        secret: getRequiredEnv<string>(configService, 'JWT_SECRET'),
        jwtAccessTokenExpiresIn: getRequiredEnv<string>(configService, 'JWT_ACCESS_TOKEN_EXPIRES_IN'),
        jwtRefreshTokenExpiresIn: getRequiredEnv<string>(configService, 'JWT_REFRESH_TOKEN_EXPIRES_IN'),
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
        urls: getRequiredEnv<string>(configService, 'RABBITMQ_URLS').split(','),
        queue: getRequiredEnv<string>(configService, 'RABBITMQ_QUEUE_NAME'),
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
        host: getRequiredEnv<string>(configService, 'REDIS_HOST'),
        port: getRequiredEnv<number>(configService, 'REDIS_PORT'),
        username: configService.get<string>('REDIS_USERNAME', ''), // Optional for Redis
        password: getRequiredEnv<string>(configService, 'REDIS_PASSWORD'),
        ttl: configService.get<number>('REDIS_TTL', 3600), // Default TTL is 1 hour
    };
});

export interface MailerConfig {
    service: 'gmail';
    auth: {
        type: 'OAuth2';
        user: string;
        clientId: string;
        clientSecret: string;
    };
}

export const mailerConfig = registerAs('mailer_env', (): MailerConfig => {
    const configService = new ConfigService();
    return {
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: getRequiredEnv<string>(configService, 'MAILER_USER'),
            clientId: getRequiredEnv<string>(configService, 'MAILER_GOOGLE_CLIENT_ID'),
            clientSecret: getRequiredEnv<string>(configService, 'MAILER_GOOGLE_CLIENT_SECRET'),
        },
    };
});
