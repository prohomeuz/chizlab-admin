import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

const ALLOWED_DAYS = [1, 7, 30, 90] as const;

export class AnalyticsSummaryQueryDto {
  @ApiPropertyOptional({ enum: ALLOWED_DAYS, default: 7 })
  @IsOptional()
  @IsIn(ALLOWED_DAYS)
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  days?: (typeof ALLOWED_DAYS)[number] = 7;
}
