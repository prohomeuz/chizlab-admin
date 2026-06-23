import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import appConfig from './config/config';
import type { AppConfig } from './config/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { MaterialsModule } from './materials/materials.module';
import { CategoriesModule } from './categories/categories.module';
import { UploadModule } from './upload/upload.module';
import { PublicModule } from './public/public.module';
import { InternalModule } from './internal/internal.module';
import { Material } from './materials/material.entity';
import { Category } from './categories/category.entity';
import { Admin } from './auth/admin.entity';
import * as path from 'path';

@Module({
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => {
        const cfg = cs.get<AppConfig>('app');
        if (!cfg) throw new Error('App config not loaded');
        return {
          type: 'postgres',
          host: cfg.dbHost,
          port: cfg.dbPort,
          username: cfg.dbUser,
          password: cfg.dbPassword,
          database: cfg.dbName,
          entities: [Material, Category, Admin],
          migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
          migrationsRun: true,
          synchronize: cfg.dbSynchronize,
          logging: cfg.nodeEnv !== 'production',
        };
      },
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => {
        const cfg = cs.get<AppConfig>('app')!;
        return {
          redis: {
            host: cfg.redisHost,
            port: cfg.redisPort,
          },
        };
      },
    }),

    AuthModule,
    MaterialsModule,
    CategoriesModule,
    UploadModule,
    PublicModule,
    InternalModule,
  ],
})
export class AppModule {}
