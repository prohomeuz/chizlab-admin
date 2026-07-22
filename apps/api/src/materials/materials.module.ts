import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from './material.entity';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { AiJobService } from './ai-job.service';
import { PagePrepController } from './page-prep.controller';
import { PagePrepService } from './page-prep.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TypeOrmModule.forFeature([Material]), TelegramModule],
  controllers: [MaterialsController, PagePrepController],
  providers: [MaterialsService, AiJobService, PagePrepService],
  exports: [MaterialsService, PagePrepService],
})
export class MaterialsModule {}
