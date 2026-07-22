import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/category.entity';
import { Material } from '../materials/material.entity';
import { TelegramService } from './telegram.service';

@Module({
  imports: [TypeOrmModule.forFeature([Material, Category])],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
