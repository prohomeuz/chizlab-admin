import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Exactly 8 numeric digits',
    example: '12345678',
    pattern: '^\\d{8}$',
  })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'pin must be exactly 8 digits' })
  pin!: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: 900 })
  expiresIn!: number;
}
