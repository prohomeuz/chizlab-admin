import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEvent } from './analytics-event.entity';
import { AnalyticsService } from './analytics.service';
import { PublicAnalyticsController } from './public-analytics.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { OriginGuard } from '../public/origin.guard';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([AnalyticsEvent])],
  controllers: [PublicAnalyticsController, AdminAnalyticsController],
  providers: [AnalyticsService, OriginGuard],
})
export class AnalyticsModule {}
