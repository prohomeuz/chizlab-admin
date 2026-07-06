import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
// IsUrl kept for structured validation; require_tld:false allows internal MinIO hostnames
import { MaterialType } from '../material.entity';

export class CreateMaterialDto {
  @ApiPropertyOptional({ format: 'uri', nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  mediaUrl?: string | null;

  @ApiPropertyOptional({ enum: MaterialType, nullable: true })
  @IsOptional()
  @IsEnum(MaterialType)
  materialType?: MaterialType | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: [Number],
    description: 'Which page numbers (1-indexed) should be included in AI analysis',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  selectedPages?: number[];
}
