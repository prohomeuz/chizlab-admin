import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMaterialDto } from './dto/create-material.dto';
import { ListMaterialsDto } from './dto/list-materials.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialsService } from './materials.service';

@ApiTags('admin-materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/admin/materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @ApiOperation({ operationId: 'adminListMaterials', summary: 'List materials (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated list of materials' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: ListMaterialsDto) {
    return this.materialsService.findAll(query);
  }

  @Post()
  @ApiOperation({ operationId: 'adminCreateMaterial', summary: 'Create material (admin)' })
  @ApiResponse({ status: 201, description: 'Material created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateMaterialDto) {
    return this.materialsService.create(dto);
  }

  @Get(':id/progress')
  @ApiOperation({ operationId: 'adminGetMaterialProgress', summary: 'Get AI processing progress (0–100)' })
  @ApiResponse({ status: 200, description: 'Progress percentage' })
  async getProgress(@Param('id', ParseUUIDPipe) id: string): Promise<{ progress: number }> {
    const progress = await this.materialsService.getProgress(id);
    return { progress };
  }

  @Get(':id')
  @ApiOperation({ operationId: 'adminGetMaterial', summary: 'Get material by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Material found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.materialsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ operationId: 'adminUpdateMaterial', summary: 'Update material (admin)' })
  @ApiResponse({ status: 200, description: 'Material updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMaterialDto) {
    return this.materialsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'adminDeleteMaterial', summary: 'Soft-delete material (admin)' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.materialsService.remove(id);
  }
}
