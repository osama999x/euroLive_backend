import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@kinglive.local' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ example: 'ChangeMe@Admin1' })
  @IsString()
  @MinLength(8)
  password: string;
}
