import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AnalyticsEventType } from '../analytics-event.entity';

export class TrackEventItemDto {
  @ApiProperty({ enum: AnalyticsEventType })
  @IsIn(Object.values(AnalyticsEventType))
  type!: AnalyticsEventType;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  path!: string;

  @ApiProperty({ required: false, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  label?: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  sessionId!: string;
}

export class TrackEventsDto {
  @ApiProperty({ type: [TrackEventItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TrackEventItemDto)
  events!: TrackEventItemDto[];
}
