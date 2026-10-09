import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BanDuration, BanType } from '../../../common/enums';

export class CreateBanDto {
  @ApiProperty({ enum: BanType })
  @IsEnum(BanType)
  type: BanType;

  @ApiProperty({ enum: BanDuration })
  @IsEnum(BanDuration)
  duration: BanDuration;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  customHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Required when type=device' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'When type=id, also ban every known device' })
  @IsOptional()
  @IsBoolean()
  includeDevices?: boolean;
}
