import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import {
  AccountStatus,
  ActorType,
  AssignDuration,
  CatalogItemType,
  LedgerDirection,
  LedgerType,
  UserItemSource,
  UserItemStatus,
  WalletCurrency,
  WalletOwnerType,
} from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { expiryFromDuration, getPagination, hashPassword } from '../../common/utils';
import {
  LedgerEntry,
  Reseller,
  ResellerPermissions,
  UserItem,
} from '../../database/entities';
import { WalletService } from '../wallet/wallet.service';
import { UsersService } from '../users/users.service';
import { CatalogService } from '../catalog/catalog.service';
import { AuditService } from '../audit/audit.service';
import { RequestMetaDto } from '../../common/decorators';
import { JwtPayload } from '../../common/interfaces';

export interface CreateResellerInput {
  email: string;
  username: string;
  password: string;
  displayName: string;
  creditLimit?: number;
  commissionRate?: number;
  initialBalance?: number;
  isOfficial?: boolean;
  officialId?: string;
  permissions?: Partial<ResellerPermissions>;
}

export interface AssignItemInput {
  publicId: string;
  catalogItemId: string;
  duration: AssignDuration;
  customDays?: number;
}

@Injectable()
export class ResellersService {
  constructor(
    @InjectRepository(Reseller)
    private readonly resellers: Repository<Reseller>,
    @InjectRepository(ResellerPermissions)
    private readonly permissions: Repository<ResellerPermissions>,
    @InjectRepository(UserItem)
    private readonly userItems: Repository<UserItem>,
    @InjectRepository(LedgerEntry)
    private readonly ledger: Repository<LedgerEntry>,
    private readonly wallets: WalletService,
    private readonly users: UsersService,
    private readonly catalog: CatalogService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateResellerInput, actor: JwtPayload, meta?: RequestMetaDto) {
    const duplicate = await this.resellers.findOne({
      where: [{ email: input.email }, { username: input.username }],
    });
    if (duplicate) {
      throw new AppException('Reseller email or username already exists', HttpStatus.CONFLICT);
    }

    const reseller = this.resellers.create({
      email: input.email.toLowerCase(),
      username: input.username,
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName,
      creditLimit: input.creditLimit ?? 0,
      commissionRate: input.commissionRate ?? 0,
      status: AccountStatus.ACTIVE,
      isOfficial: input.isOfficial ?? false,
      officialId: input.isOfficial
        ? input.officialId || `OFF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        : input.officialId,
    });
    const saved = await this.resellers.save(reseller);

    const perms = this.permissions.create({
      resellerId: saved.id,
      canRecharge: input.permissions?.canRecharge ?? false,
      canAssignFrame: input.permissions?.canAssignFrame ?? false,
      canAssignEntry: input.permissions?.canAssignEntry ?? false,
      canAssignBadge: input.permissions?.canAssignBadge ?? false,
      canRemove: input.permissions?.canRemove ?? false,
      canSetExpiry: input.permissions?.canSetExpiry ?? false,
      canViewSosAlerts: input.permissions?.canViewSosAlerts ?? false,
      canViewComplaintEvidence: input.permissions?.canViewComplaintEvidence ?? false,
      dailyRechargeLimit: input.permissions?.dailyRechargeLimit,
      dailyFrameLimit: input.permissions?.dailyFrameLimit,
      dailyEntryLimit: input.permissions?.dailyEntryLimit,
      dailyBadgeLimit: input.permissions?.dailyBadgeLimit,
    });
    saved.permissions = await this.permissions.save(perms);

    await this.wallets.getOrCreateWallet(WalletOwnerType.RESELLER, saved.id);

    if (input.initialBalance && input.initialBalance > 0) {
      await this.wallets.adjust({
        ownerType: WalletOwnerType.RESELLER,
        ownerId: saved.id,
        currency: WalletCurrency.COIN,
        direction: LedgerDirection.CREDIT,
        amount: input.initialBalance,
        type: LedgerType.ADMIN_ADJUST,
        actor: { type: ActorType.STAFF, id: actor.sub },
        note: 'Initial reseller balance',
      });
    }

    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'reseller.create',
      targetType: 'reseller',
      targetId: saved.id,
      after: this.toPublic(saved),
      meta,
    });

    return this.findById(saved.id);
  }

  async findById(id: string): Promise<Reseller> {
    const reseller = await this.resellers.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!reseller) {
      throw new AppException('Reseller not found', HttpStatus.NOT_FOUND);
    }
    return reseller;
  }

  async findByLogin(login: string): Promise<Reseller | null> {
    return this.resellers
      .createQueryBuilder('reseller')
      .addSelect(['reseller.passwordHash'])
      .leftJoinAndSelect('reseller.permissions', 'permissions')
      .where('LOWER(reseller.email) = LOWER(:login) OR reseller.username = :login', {
        login,
      })
      .getOne();
  }

  async list(
    query: PaginationQueryDto & { search?: string; status?: AccountStatus },
  ): Promise<PaginatedResultDto<ReturnType<ResellersService['toPublic']>>> {
    const { skip, take, page, limit } = getPagination(query);
    const qb = this.resellers
      .createQueryBuilder('reseller')
      .leftJoinAndSelect('reseller.permissions', 'permissions')
      .orderBy('reseller.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('reseller.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(
        '(reseller.username ILIKE :q OR reseller.email ILIKE :q OR reseller.displayName ILIKE :q)',
        { q: `%${query.search}%` },
      );
    }

    const [rows, total] = await qb.skip(skip).take(take).getManyAndCount();
    return new PaginatedResultDto(
      rows.map((row) => this.toPublic(row)),
      total,
      page,
      limit,
    );
  }

  async updateProfile(
    id: string,
    patch: Partial<Pick<Reseller, 'displayName' | 'status' | 'email' | 'isOfficial' | 'officialId'>>,
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    const before = await this.findById(id);
    Object.assign(before, patch);
    const saved = await this.resellers.save(before);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'reseller.update',
      targetType: 'reseller',
      targetId: id,
      before: this.toPublic(before),
      after: this.toPublic(saved),
      meta,
    });
    return this.toPublic(await this.findById(id));
  }

  async updatePermissions(
    id: string,
    patch: Partial<ResellerPermissions>,
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    const reseller = await this.findById(id);
    const perms = reseller.permissions ?? this.permissions.create({ resellerId: id });
    const before = { ...perms };
    Object.assign(perms, patch, { resellerId: id });
    const saved = await this.permissions.save(perms);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'reseller.permissions',
      targetType: 'reseller',
      targetId: id,
      before,
      after: saved as unknown as Record<string, unknown>,
      meta,
    });
    return this.toPublic(await this.findById(id));
  }

  async updateLimits(
    id: string,
    patch: Pick<
      ResellerPermissions,
      'dailyRechargeLimit' | 'dailyFrameLimit' | 'dailyEntryLimit' | 'dailyBadgeLimit'
    >,
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    return this.updatePermissions(id, patch, actor, meta);
  }

  async updateCreditLimit(
    id: string,
    creditLimit: number,
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    const reseller = await this.findById(id);
    const before = reseller.creditLimit;
    reseller.creditLimit = creditLimit;
    await this.resellers.save(reseller);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'reseller.credit_limit',
      targetType: 'reseller',
      targetId: id,
      before: { creditLimit: before },
      after: { creditLimit },
      meta,
    });
    return this.toPublic(await this.findById(id));
  }

  async adjustBalance(
    id: string,
    direction: LedgerDirection,
    amount: number,
    actor: JwtPayload,
    note?: string,
    idempotencyKey?: string,
    meta?: RequestMetaDto,
  ) {
    const reseller = await this.findById(id);
    const entry = await this.wallets.adjust({
      ownerType: WalletOwnerType.RESELLER,
      ownerId: id,
      currency: WalletCurrency.COIN,
      direction,
      amount,
      type: LedgerType.ADMIN_ADJUST,
      actor: { type: ActorType.STAFF, id: actor.sub },
      creditLimit: reseller.creditLimit,
      note,
      idempotencyKey,
    });
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'reseller.balance',
      targetType: 'reseller',
      targetId: id,
      after: { direction, amount, ledgerId: entry.id },
      meta,
    });
    return { reseller: this.toPublic(await this.findById(id)), ledger: entry };
  }

  async dashboard(resellerId: string) {
    const reseller = await this.findById(resellerId);
    const wallet = await this.wallets.getWallet(WalletOwnerType.RESELLER, resellerId);
    const startOfDay = this.startOfUtcDay();
    const todaySales = await this.wallets.sumDebitsSince(
      wallet.id,
      LedgerType.RESELLER_TRANSFER_OUT,
      startOfDay,
    );
    const todayItems = await this.countAssignmentsSince(resellerId, startOfDay);

    return {
      reseller: this.toPublic(reseller),
      wallet: {
        coinBalance: wallet.coinBalance,
        diamondBalance: wallet.diamondBalance,
        creditLimit: reseller.creditLimit,
        available: wallet.coinBalance + reseller.creditLimit,
      },
      today: {
        coinTransfers: todaySales,
        itemAssignments: todayItems,
      },
    };
  }

  async limitsView(resellerId: string) {
    const reseller = await this.findById(resellerId);
    const startOfDay = this.startOfUtcDay();
    const wallet = await this.wallets.getWallet(WalletOwnerType.RESELLER, resellerId);
    const usedRecharge = await this.wallets.sumDebitsSince(
      wallet.id,
      LedgerType.RESELLER_TRANSFER_OUT,
      startOfDay,
    );

    return {
      permissions: reseller.permissions,
      usageToday: {
        recharge: usedRecharge,
        frame: await this.countAssignmentsSince(resellerId, startOfDay, CatalogItemType.FRAME),
        entry: await this.countAssignmentsSince(resellerId, startOfDay, CatalogItemType.ENTRY),
        badge: await this.countAssignmentsSince(resellerId, startOfDay, CatalogItemType.BADGE),
      },
    };
  }

  async transferCoins(
    resellerId: string,
    publicId: string,
    amount: number,
    idempotencyKey: string | undefined,
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    const reseller = await this.findById(resellerId);
    this.assertResellerActive(reseller);
    if (!reseller.permissions?.canRecharge) {
      throw new AppException('Recharge permission denied', HttpStatus.FORBIDDEN);
    }

    const user = await this.users.findByPublicId(publicId);
    await this.users.assertActive(user);

    await this.assertDailyRechargeLimit(reseller, amount);

    const result = await this.wallets.transferResellerToUser({
      resellerId,
      userId: user.id,
      amount,
      creditLimit: reseller.creditLimit,
      actor: { type: ActorType.RESELLER, id: resellerId },
      idempotencyKey,
      note: `Transfer to user ${user.publicId}`,
    });

    await this.audit.log({
      actorType: ActorType.RESELLER,
      actorId: resellerId,
      action: 'reseller.coins.transfer',
      targetType: 'user',
      targetId: user.id,
      after: { amount, publicId, ledgerDebitId: result.debit.id },
      meta,
    });

    return {
      user: { id: user.id, publicId: user.publicId, username: user.username },
      debit: result.debit,
      credit: result.credit,
    };
  }

  async assignItem(
    resellerId: string,
    type: CatalogItemType,
    input: AssignItemInput,
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    const reseller = await this.findById(resellerId);
    this.assertResellerActive(reseller);
    this.assertAssignPermission(reseller, type);

    const user = await this.users.findByPublicId(input.publicId);
    await this.users.assertActive(user);

    const item = await this.catalog.findById(input.catalogItemId);
    await this.catalog.assertAssignableByReseller(item, type);
    await this.assertDailyAssignLimit(reseller, type);

    let expiresAt: Date | null;
    try {
      if (!reseller.permissions?.canSetExpiry) {
        expiresAt =
          item.defaultExpiryDays != null
            ? expiryFromDuration(AssignDuration.CUSTOM, item.defaultExpiryDays)
            : null;
      } else {
        expiresAt = expiryFromDuration(input.duration, input.customDays);
      }
    } catch {
      throw new AppException('Invalid assignment duration', HttpStatus.BAD_REQUEST);
    }

    if (item.price > 0) {
      await this.wallets.adjust({
        ownerType: WalletOwnerType.RESELLER,
        ownerId: resellerId,
        currency: WalletCurrency.COIN,
        direction: LedgerDirection.DEBIT,
        amount: item.price,
        type: LedgerType.ITEM_ASSIGN,
        actor: { type: ActorType.RESELLER, id: resellerId },
        creditLimit: reseller.creditLimit,
        refType: 'catalog_item',
        refId: item.id,
        metadata: { userId: user.id, itemType: type },
        note: `Assign ${type} ${item.name}`,
      });
    }

    const assigned = await this.userItems.save(
      this.userItems.create({
        userId: user.id,
        catalogItemId: item.id,
        itemType: type,
        expiresAt,
        status: UserItemStatus.ACTIVE,
        source: UserItemSource.RESELLER,
        assignedByType: ActorType.RESELLER,
        assignedById: resellerId,
        durationLabel: reseller.permissions?.canSetExpiry
          ? input.duration
          : item.defaultExpiryDays != null
            ? String(item.defaultExpiryDays)
            : AssignDuration.PERMANENT,
      }),
    );

    await this.audit.log({
      actorType: ActorType.RESELLER,
      actorId: resellerId,
      action: `reseller.${type}.assign`,
      targetType: 'user_item',
      targetId: assigned.id,
      after: { publicId: user.publicId, catalogItemId: item.id, expiresAt },
      meta,
    });

    return assigned;
  }

  async removeItem(resellerId: string, itemId: string, meta?: RequestMetaDto) {
    const reseller = await this.findById(resellerId);
    this.assertResellerActive(reseller);
    if (!reseller.permissions?.canRemove) {
      throw new AppException('Remove permission denied', HttpStatus.FORBIDDEN);
    }

    const item = await this.userItems.findOne({ where: { id: itemId } });
    if (!item) {
      throw new AppException('Assignment not found', HttpStatus.NOT_FOUND);
    }
    if (item.assignedById !== resellerId) {
      throw new AppException('You can only remove items you assigned', HttpStatus.FORBIDDEN);
    }

    item.status = UserItemStatus.REMOVED;
    const saved = await this.userItems.save(item);

    await this.audit.log({
      actorType: ActorType.RESELLER,
      actorId: resellerId,
      action: 'reseller.item.remove',
      targetType: 'user_item',
      targetId: itemId,
      meta,
    });

    return saved;
  }

  async transactions(resellerId: string, query: PaginationQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const wallet = await this.wallets.getWallet(WalletOwnerType.RESELLER, resellerId);
    const [items, total] = await this.wallets.listEntries(wallet.id, skip, take);
    return new PaginatedResultDto(items, total, page, limit);
  }

  async salesReport(resellerId: string, from?: Date, to?: Date) {
    const wallet = await this.wallets.getWallet(WalletOwnerType.RESELLER, resellerId);
    const qb = this.ledger
      .createQueryBuilder('entry')
      .where('entry.walletId = :walletId', { walletId: wallet.id })
      .andWhere('entry.direction = :direction', { direction: LedgerDirection.DEBIT })
      .andWhere('entry.type IN (:...types)', {
        types: [LedgerType.RESELLER_TRANSFER_OUT, LedgerType.ITEM_ASSIGN],
      });

    if (from) {
      qb.andWhere('entry.createdAt >= :from', { from });
    }
    if (to) {
      qb.andWhere('entry.createdAt <= :to', { to });
    }

    const rows = await qb.getMany();
    const coins = rows
      .filter((row) => row.type === LedgerType.RESELLER_TRANSFER_OUT)
      .reduce((sum, row) => sum + row.amount, 0);
    const items = rows
      .filter((row) => row.type === LedgerType.ITEM_ASSIGN)
      .reduce((sum, row) => sum + row.amount, 0);

    return {
      from: from ?? null,
      to: to ?? null,
      coinTransfers: coins,
      itemSales: items,
      total: coins + items,
      count: rows.length,
    };
  }

  async commissionReport(resellerId: string, from?: Date, to?: Date) {
    const reseller = await this.findById(resellerId);
    const sales = await this.salesReport(resellerId, from, to);
    const rate = Number(reseller.commissionRate) || 0;
    return {
      ...sales,
      commissionRate: rate,
      commission: Math.floor((sales.total * rate) / 100),
    };
  }

  toPublic(reseller: Reseller) {
    return {
      id: reseller.id,
      email: reseller.email,
      username: reseller.username,
      displayName: reseller.displayName,
      creditLimit: reseller.creditLimit,
      commissionRate: Number(reseller.commissionRate),
      status: reseller.status,
      isOfficial: reseller.isOfficial,
      officialId: reseller.officialId ?? null,
      permissions: reseller.permissions
        ? {
            canRecharge: reseller.permissions.canRecharge,
            canAssignFrame: reseller.permissions.canAssignFrame,
            canAssignEntry: reseller.permissions.canAssignEntry,
            canAssignBadge: reseller.permissions.canAssignBadge,
            canRemove: reseller.permissions.canRemove,
            canSetExpiry: reseller.permissions.canSetExpiry,
            canViewSosAlerts: reseller.permissions.canViewSosAlerts,
            canViewComplaintEvidence: reseller.permissions.canViewComplaintEvidence,
            dailyRechargeLimit: reseller.permissions.dailyRechargeLimit,
            dailyFrameLimit: reseller.permissions.dailyFrameLimit,
            dailyEntryLimit: reseller.permissions.dailyEntryLimit,
            dailyBadgeLimit: reseller.permissions.dailyBadgeLimit,
          }
        : null,
      createdAt: reseller.createdAt,
      updatedAt: reseller.updatedAt,
    };
  }

  private assertResellerActive(reseller: Reseller) {
    if (reseller.status !== AccountStatus.ACTIVE) {
      throw new AppException('Reseller account is not active', HttpStatus.FORBIDDEN);
    }
  }

  private assertAssignPermission(reseller: Reseller, type: CatalogItemType) {
    const map = {
      [CatalogItemType.FRAME]: reseller.permissions?.canAssignFrame,
      [CatalogItemType.ENTRY]: reseller.permissions?.canAssignEntry,
      [CatalogItemType.BADGE]: reseller.permissions?.canAssignBadge,
    };
    if (!map[type]) {
      throw new AppException(`Permission denied for ${type} assignment`, HttpStatus.FORBIDDEN);
    }
  }

  private async assertDailyRechargeLimit(reseller: Reseller, amount: number) {
    const limit = reseller.permissions?.dailyRechargeLimit;
    if (limit == null) {
      return;
    }
    const wallet = await this.wallets.getWallet(WalletOwnerType.RESELLER, reseller.id);
    const used = await this.wallets.sumDebitsSince(
      wallet.id,
      LedgerType.RESELLER_TRANSFER_OUT,
      this.startOfUtcDay(),
    );
    if (used + amount > limit) {
      throw new AppException('Daily recharge limit exceeded', HttpStatus.FORBIDDEN);
    }
  }

  private async assertDailyAssignLimit(reseller: Reseller, type: CatalogItemType) {
    const limitMap = {
      [CatalogItemType.FRAME]: reseller.permissions?.dailyFrameLimit,
      [CatalogItemType.ENTRY]: reseller.permissions?.dailyEntryLimit,
      [CatalogItemType.BADGE]: reseller.permissions?.dailyBadgeLimit,
    };
    const limit = limitMap[type];
    if (limit == null) {
      return;
    }
    const used = await this.countAssignmentsSince(reseller.id, this.startOfUtcDay(), type);
    if (used >= limit) {
      throw new AppException(`Daily ${type} assignment limit exceeded`, HttpStatus.FORBIDDEN);
    }
  }

  private async countAssignmentsSince(
    resellerId: string,
    since: Date,
    type?: CatalogItemType,
  ): Promise<number> {
    const qb = this.userItems
      .createQueryBuilder('item')
      .where('item.assignedById = :resellerId', { resellerId })
      .andWhere('item.assignedByType = :actor', { actor: ActorType.RESELLER })
      .andWhere('item.createdAt >= :since', { since })
      .andWhere('item.status != :removed', { removed: UserItemStatus.REMOVED });

    if (type) {
      qb.andWhere('item.itemType = :type', { type });
    }

    return qb.getCount();
  }

  private startOfUtcDay(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
