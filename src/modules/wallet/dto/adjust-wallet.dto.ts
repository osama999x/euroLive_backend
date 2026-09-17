import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { LedgerDirection, WalletCurrency, WalletOwnerType } from '../../../common/enums';

export class AdjustWalletDto {
  @ApiProperty({ enum: WalletOwnerType })
  @IsEnum(WalletOwnerType)
  ownerType: WalletOwnerType;

  @ApiProperty()
  @IsString()
  ownerId: string;

  @ApiProperty({ enum: WalletCurrency })
  @IsEnum(WalletCurrency)
  currency: WalletCurrency;

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
