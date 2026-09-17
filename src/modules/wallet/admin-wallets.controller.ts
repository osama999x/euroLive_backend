import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccountTypes,
  CurrentUser,
  RequestMeta,
  RequestMetaDto,
  Roles,
} from '../../common/decorators';
import {
  AccountType,
  ActorType,
  LedgerType,
  StaffRole,
  WalletOwnerType,
} from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { WalletService } from './wallet.service';
import { AdjustWalletDto } from './dto/adjust-wallet.dto';
import { AuditService } from '../audit/audit.service';
import { ResellersService } from '../resellers/resellers.service';

@ApiTags('Admin Wallets')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
@Controller('admin/wallets')
export class AdminWalletsController {
  constructor(
    private readonly wallets: WalletService,
    private readonly audit: AuditService,
    private readonly resellers: ResellersService,
  ) {}

  @Post('adjust')
  @ApiOperation({ summary: 'Manually credit or debit a user or reseller wallet' })
  async adjust(
    @Body() dto: AdjustWalletDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    let creditLimit = 0;
    if (dto.ownerType === WalletOwnerType.RESELLER) {
      const reseller = await this.resellers.findById(dto.ownerId);
      creditLimit = reseller.creditLimit;
    }

    const entry = await this.wallets.adjust({
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      currency: dto.currency,
      direction: dto.direction,
      amount: dto.amount,
      type: LedgerType.ADMIN_ADJUST,
      actor: { type: ActorType.STAFF, id: actor.sub },
      creditLimit,
      note: dto.note,
      idempotencyKey: dto.idempotencyKey,
    });

    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'wallet.adjust',
      targetType: dto.ownerType,
      targetId: dto.ownerId,
      after: {
        direction: dto.direction,
        amount: dto.amount,
        currency: dto.currency,
        ledgerId: entry.id,
      },
      meta,
    });

    return entry;
  }
}
