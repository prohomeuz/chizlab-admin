import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/category.entity';
import { MaterialsModule } from '../materials/materials.module';
import { InternalController } from './internal.controller';
import { InternalSecretGuard } from './internal-secret.guard';
import { InternalService } from './internal.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Category]), MaterialsModule],
  controllers: [InternalController],
  providers: [InternalService, InternalSecretGuard],
})
export class InternalModule {}
