import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PagePrepResultDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @ApiProperty()
  @IsBoolean()
  success!: boolean;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageCount?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  thumbnailUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;
}
