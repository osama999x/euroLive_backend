import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AccountTypes, Roles } from '../../common/decorators';
import {
  AccountType,
  ComplaintStatus,
  FreezeStatus,
  PayoutBatchStatus,
  RoomStatus,
  SosStatus,
  StaffRole,
  UserStatus,
  WalletOwnerType,
} from '../../common/enums';
import {
  AccountFreeze,
  Complaint,
  PayoutBatch,
  Reseller,
  Room,
  SosAlert,
  User,
  Wallet,
} from '../../database/entities';

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
    @InjectRepository(Room)
    private readonly rooms: Repository<Room>,
    @InjectRepository(SosAlert)
    private readonly sos: Repository<SosAlert>,
    @InjectRepository(Complaint)
    private readonly complaints: Repository<Complaint>,
    @InjectRepository(PayoutBatch)
    private readonly payouts: Repository<PayoutBatch>,
    @InjectRepository(AccountFreeze)
    private readonly freezes: Repository<AccountFreeze>,
  ) {}

  @Get()
  @Roles(
    StaffRole.SUPER_ADMIN,
    StaffRole.ADMIN,
    StaffRole.FINANCE,
    StaffRole.SUPPORT,
    StaffRole.MODERATOR,
  )
  @ApiOperation({ summary: 'Admin KPI snapshot including Euro Live queues' })
  async dashboard() {
    const [
      usersTotal,
      usersBanned,
      resellersTotal,
      coinRow,
      activeRooms,
      openSos,
      openComplaints,
      pendingPayouts,
      frozenWallets,
    ] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { status: UserStatus.BANNED } }),
      this.resellers.count(),
      this.wallets
        .createQueryBuilder('wallet')
        .select('COALESCE(SUM(wallet.coinBalance), 0)', 'total')
        .where('wallet.ownerType = :type', { type: WalletOwnerType.USER })
        .getRawOne<{ total: string }>(),
      this.rooms.count({ where: { status: RoomStatus.OPEN } }),
      this.sos.count({
        where: { status: In([SosStatus.OPEN, SosStatus.ESCALATED, SosStatus.HANDLING]) },
      }),
      this.complaints.count({
        where: { status: In([ComplaintStatus.RECEIVED, ComplaintStatus.UNDER_REVIEW]) },
      }),
      this.payouts.count({
        where: { status: In([PayoutBatchStatus.CALCULATED, PayoutBatchStatus.HOLDING]) },
      }),
      this.freezes.count({
        where: { status: In([FreezeStatus.FROZEN, FreezeStatus.PENDING_REVIEW]) },
      }),
    ]);

    return {
      dau: 0,
      mau: 0,
      revenue: 0,
      activeRooms,
      pendingWithdrawals: pendingPayouts,
      flaggedReports: openComplaints,
      usersTotal,
      usersBanned,
      resellersTotal,
      coinsInCirculation: Number(coinRow?.total ?? 0),
      pendingPayouts,
      openSos,
      openComplaints,
      frozenWallets,
    };
  }
}
