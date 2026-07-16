import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OriginGuard } from '../public/origin.guard';
import { AnalyticsService } from './analytics.service';
import { TrackEventsDto } from './dto/track-events.dto';

@ApiTags('public-analytics')
@UseGuards(OriginGuard)
@Controller('api/public/analytics')
export class PublicAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'trackAnalyticsEvents', summary: 'Ingest page view / click events (public)' })
  @ApiResponse({ status: 204, description: 'Events recorded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async track(@Body() dto: TrackEventsDto): Promise<void> {
    await this.analyticsService.track(dto.events);
  }
}
