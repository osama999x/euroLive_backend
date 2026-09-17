import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AccountStatus, LedgerDirection } from '../../../common/enums';

export class ResellerPermissionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canRecharge?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canAssignFrame?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canAssignEntry?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canAssignBadge?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canRemove?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canSetExpiry?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyRechargeLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyFrameLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyEntryLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyBadgeLimit?: number;
}

export class CreateResellerDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  initialBalance?: number;

  @ApiPropertyOptional({ type: ResellerPermissionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResellerPermissionsDto)
  permissions?: ResellerPermissionsDto;
}

export class UpdateResellerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ enum: AccountStatus })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}

export class UpdateCreditLimitDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  creditLimit: number;
}

export class AdjustBalanceDto {
  @ApiProperty({ enum: LedgerDirection })
  @IsEnum(LedgerDirection)
  direction: LedgerDirection;

  @ApiProperty()
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class TransferCoinsDto {
  @ApiProperty({ example: '10000001' })
  @IsString()
  @IsNotEmpty()
  publicId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class AssignItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  publicId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  catalogItemId: string;

  @ApiProperty({ enum: ['1', '7', '30', 'custom', 'permanent'] })
  @IsString()
  duration: '1' | '7' | '30' | 'custom' | 'permanent';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  customDays?: number;
}
