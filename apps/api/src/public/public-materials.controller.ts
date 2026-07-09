import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MaterialsService } from '../materials/materials.service';
import { OriginGuard } from './origin.guard';
import { PublicListMaterialsDto } from './dto/public-list.dto';

@ApiTags('public-materials')
@UseGuards(OriginGuard)
@Controller('api/public/materials')
export class PublicMaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @ApiOperation({ operationId: 'publicListMaterials', summary: 'List active materials (public)' })
  @ApiResponse({ status: 200, description: 'Paginated active materials' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: PublicListMaterialsDto) {
    return this.materialsService.findPublicList(
      query.limit ?? 20,
      query.offset ?? 0,
      query.categoryId,
      query.tags,
      query.search,
    );
  }

  @Get(':id')
  @ApiOperation({ operationId: 'publicGetMaterial', summary: 'Get single active material (public)' })
  @ApiResponse({ status: 200, description: 'Material found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.findPublicOne(id);
  }
}
