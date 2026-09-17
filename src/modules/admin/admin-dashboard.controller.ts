import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountTypes, Roles } from '../../common/decorators';
import { AccountType, StaffRole, UserStatus, WalletOwnerType } from '../../common/enums';
import { Reseller, User, Wallet } from '../../database/entities';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Reseller)
    private readonly resellers: Repository<Reseller>,
    @InjectRepository(Wallet)
    private readonly wallets: Repository<Wallet>,
  ) {}

  @Get()
  @Roles(
    StaffRole.SUPER_ADMIN,
    StaffRole.ADMIN,
    StaffRole.FINANCE,
    StaffRole.SUPPORT,
    StaffRole.MODERATOR,
  )
  @ApiOperation({ summary: 'Admin KPI snapshot' })
  async dashboard() {
    const [usersTotal, usersBanned, resellersTotal, coinRow] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { status: UserStatus.BANNED } }),
      this.resellers.count(),
      this.wallets
        .createQueryBuilder('wallet')
        .select('COALESCE(SUM(wallet.coinBalance), 0)', 'total')
        .where('wallet.ownerType = :type', { type: WalletOwnerType.USER })
        .getRawOne<{ total: string }>(),
    ]);

    return {
      dau: 0,
      mau: 0,
      revenue: 0,
      activeRooms: 0,
      pendingWithdrawals: 0,
      flaggedReports: 0,
      usersTotal,
      usersBanned,
      resellersTotal,
      coinsInCirculation: Number(coinRow?.total ?? 0),
    };
  }
}
