import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ComplaintSeverity,
  ComplaintType,
  EvidenceType,
  FreezeType,
} from '../../../common/enums';

export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;
}

export class RoomBackgroundDto {
  @ApiProperty()
  @IsUUID()
  catalogItemId: string;
}

export class RoomUserDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EvidenceDto {
  @ApiProperty({ enum: EvidenceType })
  @IsEnum(EvidenceType)
  type: EvidenceType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  url: string;
}

export class CreateReportDto {
  @ApiProperty()
  @IsUUID()
  targetId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiPropertyOptional({ enum: ComplaintSeverity })
  @IsOptional()
  @IsEnum(ComplaintSeverity)
  severity?: ComplaintSeverity;

  @ApiPropertyOptional({ enum: ComplaintType })
  @IsOptional()
  @IsEnum(ComplaintType)
  type?: ComplaintType;

  @ApiPropertyOptional({ type: [EvidenceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  evidence?: EvidenceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  protectionLock?: boolean;
}

export class ReviewComplaintDto {
  @ApiProperty({ enum: ['confirm', 'reject', 'close'] })
  @IsString()
  action: 'confirm' | 'reject' | 'close';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  penalty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  salaryDeduct?: boolean;
}

export class CreateSosDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedResellerId?: string;
}

export class ResolveSosDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  outcome: string;
}

export class SalaryPinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  pin: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentPin?: string;
}

export class SalaryViewDto {
  @ApiProperty()
  @IsString()
  pin: string;
}

export class RecordHoursDto {
  @ApiProperty()
  @IsUUID()
  periodId: string;

  @ApiProperty()
  @IsNumber()
  liveHours: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  liveDays: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  beans?: number;
}

export class CreatePeriodDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  startsOn: string;

  @ApiProperty()
  @IsString()
  endsOn: string;
}

export class CreateSalaryRuleDto {
  @ApiProperty()
  @IsString()
  countryCode: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  requiredHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  requiredDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  requiredBeans?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  salaryAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  bonusAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  agencySharePercent?: number;
}

export class CalculatePayoutDto {
  @ApiProperty()
  @IsUUID()
  periodId: string;
}

export class CorrectPayoutDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  newAmount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReviewFraudDto {
  @ApiProperty({ enum: ['restore', 'correct', 'penalty', 'ban'] })
  @IsString()
  action: 'restore' | 'correct' | 'penalty' | 'ban';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  amount?: number;
}

export class BackupSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  intervalHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  totp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminFreezeDto {
  @ApiProperty()
  @IsUUID()
  ownerId: string;

  @ApiProperty()
  @IsString()
  ownerType: string;

  @ApiProperty({ enum: FreezeType })
  @IsEnum(FreezeType)
  freezeType: FreezeType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReviewFreezeDto {
  @ApiProperty({ enum: ['restore', 'confirm', 'ban'] })
  @IsString()
  action: 'restore' | 'confirm' | 'ban';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class ResetPinDto {
  @ApiProperty()
  @IsString()
  otp: string;

  @ApiProperty()
  @IsString()
  pin: string;
}

export class UpdateCountryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  payoutHoldDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}
