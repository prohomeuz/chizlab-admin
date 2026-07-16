import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSummaryQueryDto } from './dto/analytics-summary-query.dto';

@ApiTags('admin-analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ operationId: 'adminAnalyticsSummary', summary: 'Site analytics summary (admin)' })
  @ApiResponse({ status: 200, description: 'Top pages, top clicked elements and totals' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  summary(@Query() query: AnalyticsSummaryQueryDto) {
    return this.analyticsService.summary(query.days ?? 7);
  }
}
