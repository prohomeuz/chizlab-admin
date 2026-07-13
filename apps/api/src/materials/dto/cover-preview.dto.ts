import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** Fields drawn on the generated cover — used for the admin form's live preview. */
export class CoverPreviewDto {
  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  title?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @ApiPropertyOptional({ nullable: true, minimum: 1900, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Transform(({ value }: { value: unknown }) =>
    value !== null && value !== undefined ? parseInt(String(value), 10) : null,
  )
  publishYear?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  publishPlace?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  country?: string | null;
}
