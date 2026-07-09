import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  // DB
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbSynchronize: boolean;
  // Redis
  redisHost: string;
  redisPort: number;
  // JWT
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: number;
  jwtRefreshExpiresIn: number;
  // Admin
  adminPin: string;
  // MinIO
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey: string;
  minioBucket: string;
  minioPublicUrl: string;
  // Security
  publicAllowedOrigins: string[];
  internalCallbackSecret: string;
  corsOrigins: string[];
}

export default registerAs('app', (): AppConfig => ({
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  dbHost: process.env['DATABASE_HOST'] ?? 'localhost',
  dbPort: parseInt(process.env['DATABASE_PORT'] ?? '5432', 10),
  dbUser: process.env['DATABASE_USER'] ?? 'chizlab',
  dbPassword: process.env['DATABASE_PASSWORD'] ?? 'chizlab_password',
  dbName: process.env['DATABASE_NAME'] ?? 'chizlab_materials',
  dbSynchronize: process.env['DATABASE_SYNCHRONIZE'] === 'true',

  redisHost: process.env['REDIS_HOST'] ?? 'localhost',
  redisPort: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),

  jwtAccessSecret: process.env['JWT_ACCESS_SECRET'] ?? 'access_secret_change_me',
  jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'refresh_secret_change_me',
  jwtAccessExpiresIn: parseInt(process.env['JWT_ACCESS_EXPIRES_IN'] ?? '900', 10),
  jwtRefreshExpiresIn: parseInt(process.env['JWT_REFRESH_EXPIRES_IN'] ?? '604800', 10),

  adminPin: process.env['ADMIN_PIN'] ?? '12345678',

  minioEndpoint: process.env['MINIO_ENDPOINT'] ?? 'http://localhost:9000',
  minioAccessKey: process.env['MINIO_ACCESS_KEY'] ?? 'minioadmin',
  minioSecretKey: process.env['MINIO_SECRET_KEY'] ?? 'minioadmin',
  minioBucket: process.env['MINIO_BUCKET'] ?? 'chizlab-media',
  minioPublicUrl: process.env['MINIO_PUBLIC_URL'] ?? 'http://localhost:9000/chizlab-media',

  publicAllowedOrigins: (process.env['PUBLIC_ALLOWED_ORIGINS'] ?? 'chizlab.uz,www.chizlab.uz,api.chizlab.uz')
    .split(',')
    .map(o => o.trim().toLowerCase())
    .filter(Boolean),
  internalCallbackSecret: process.env['INTERNAL_CALLBACK_SECRET'] ?? '',
  corsOrigins: (process.env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),
}));
