import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from '../categories/categories.service';
import { OriginGuard } from './origin.guard';

@ApiTags('public-categories')
@UseGuards(OriginGuard)
@Controller('api/public/categories')
export class PublicCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ operationId: 'publicListCategories', summary: 'List all categories (public)' })
  @ApiResponse({ status: 200, description: 'Flat list of categories' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.categoriesService.findAll();
  }
}
