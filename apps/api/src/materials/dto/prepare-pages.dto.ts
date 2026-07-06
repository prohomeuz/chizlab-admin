import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';

export class PreparePagesDto {
  @ApiProperty({ format: 'uri' })
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  mediaUrl!: string;
}
