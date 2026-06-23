import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AiResultDto } from './dto/ai-result.dto';
import { InternalSecretGuard } from './internal-secret.guard';
import { InternalService } from './internal.service';

/**
 * INTERNAL ENDPOINT — never publicly routed.
 * Protected by X-Internal-Secret header.
 */
@ApiTags('internal')
@ApiSecurity('InternalSecret')
@UseGuards(InternalSecretGuard)
@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post('ai-result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'internalAiResult', summary: 'AI worker result callback (internal)' })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Invalid internal secret' })
  handleAiResult(@Body() dto: AiResultDto): Promise<{ ok: boolean }> {
    return this.internalService.handleAiResult(dto);
  }
}
