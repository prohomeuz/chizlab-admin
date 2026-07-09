import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CategoriesModule } from '../categories/categories.module';
import { MaterialsModule } from '../materials/materials.module';
import { OriginGuard } from './origin.guard';
import { PublicCategoriesController } from './public-categories.controller';
import { PublicMaterialsController } from './public-materials.controller';

@Module({
  imports: [ConfigModule, MaterialsModule, CategoriesModule],
  controllers: [PublicMaterialsController, PublicCategoriesController],
  providers: [OriginGuard],
})
export class PublicModule {}
