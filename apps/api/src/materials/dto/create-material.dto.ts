import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
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
}
