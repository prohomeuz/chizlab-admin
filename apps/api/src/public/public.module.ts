import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CategoriesModule } from '../categories/categories.module';
import { MaterialsModule } from '../materials/materials.module';
import { ApiKeyGuard } from './api-key.guard';
import { PublicCategoriesController } from './public-categories.controller';
import { PublicMaterialsController } from './public-materials.controller';

@Module({
  imports: [ConfigModule, MaterialsModule, CategoriesModule],
  controllers: [PublicMaterialsController, PublicCategoriesController],
  providers: [ApiKeyGuard],
})
export class PublicModule {}
