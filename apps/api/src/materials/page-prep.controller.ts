import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PreparePagesDto } from './dto/prepare-pages.dto';
import { PagePrepService, PagePrepStatus } from './page-prep.service';

@ApiTags('admin-materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/admin/materials/prepare-pages')
export class PagePrepController {
  constructor(private readonly pagePrepService: PagePrepService) {}

  @Post()
  @ApiOperation({
    operationId: 'adminPreparePages',
    summary: 'Kick off page-thumbnail generation for an uploaded file (admin)',
  })
  @ApiResponse({ status: 201, description: 'Job enqueued' })
  async prepare(@Body() dto: PreparePagesDto): Promise<{ jobId: string }> {
    const jobId = uuidv4();
    await this.pagePrepService.enqueue(jobId, dto.mediaUrl);
    return { jobId };
  }

  @Get(':jobId')
  @ApiOperation({
    operationId: 'adminGetPreparePagesStatus',
    summary: 'Poll page-thumbnail generation status (admin)',
  })
  @ApiResponse({ status: 200, description: 'Job status' })
  async status(@Param('jobId') jobId: string): Promise<PagePrepStatus> {
    return this.pagePrepService.getStatus(jobId);
  }
}
