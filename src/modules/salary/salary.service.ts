import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import {
  ActorType,
  ComplaintStatus,
  LedgerDirection,
  LedgerType,
  PayoutBatchStatus,
  PayoutPartyType,
  SalaryLineStatus,
  StaffRole,
  WalletCurrency,
  WalletOwnerType,
} from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { getPagination } from '../../common/utils';
import {
  Complaint,
  Country,
  HostProfile,
  PayoutBatch,
  PayoutBatchItem,
  SalaryLine,
  SalaryPeriod,
  SalaryTargetRule,
} from '../../database/entities';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { HostsService } from '../hosts/hosts.service';
import { JwtPayload } from '../../common/interfaces';
import { RequestMetaDto } from '../../common/decorators';

@Injectable()
export class SalaryService {
  constructor(
    @InjectRepository(Country)
    private readonly countries: Repository<Country>,
    @InjectRepository(SalaryTargetRule)
    private readonly rules: Repository<SalaryTargetRule>,
    @InjectRepository(SalaryPeriod)
    private readonly periods: Repository<SalaryPeriod>,
    @InjectRepository(SalaryLine)
    private readonly lines: Repository<SalaryLine>,
    @InjectRepository(PayoutBatch)
    private readonly batches: Repository<PayoutBatch>,
    @InjectRepository(PayoutBatchItem)
    private readonly items: Repository<PayoutBatchItem>,
    @InjectRepository(HostProfile)
    private readonly hosts: Repository<HostProfile>,
    @InjectRepository(Complaint)
    private readonly complaints: Repository<Complaint>,
    private readonly wallets: WalletService,
    private readonly audit: AuditService,
    private readonly hostsService: HostsService,
  ) {}

  listCountries() {
    return this.countries.find({ order: { code: 'ASC' } });
  }

  async updateCountry(code: string, patch: Partial<Country>, actor: JwtPayload, meta?: RequestMetaDto) {
    this.assertMaster(actor);
    const row = await this.countries.findOne({ where: { code } });
    if (!row) {
      throw new AppException('Country not found', HttpStatus.NOT_FOUND);
    }
    Object.assign(row, patch);
    const saved = await this.countries.save(row);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'country.update',
      targetType: 'country',
      targetId: code,
      after: saved as unknown as Record<string, unknown>,
      meta,
    });
    return saved;
  }

  async createRule(input: Partial<SalaryTargetRule>, actor: JwtPayload, meta?: RequestMetaDto) {
    this.assertMaster(actor);
    if (!input.countryCode || !input.name) {
      throw new AppException('countryCode and name are required', HttpStatus.BAD_REQUEST);
    }
    const saved = await this.rules.save(this.rules.create(input));
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'salary.rule.create',
      targetType: 'salary_rule',
      targetId: saved.id,
      after: saved as unknown as Record<string, unknown>,
      meta,
    });
    return saved;
  }

  async updateRule(id: string, patch: Partial<SalaryTargetRule>, actor: JwtPayload, meta?: RequestMetaDto) {
    this.assertMaster(actor);
    const row = await this.rules.findOne({ where: { id } });
    if (!row) {
      throw new AppException('Salary rule not found', HttpStatus.NOT_FOUND);
    }
    Object.assign(row, patch);
    const saved = await this.rules.save(row);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'salary.rule.update',
      targetType: 'salary_rule',
      targetId: id,
      meta,
    });
    return saved;
  }

  listRules(countryCode?: string) {
    const where = countryCode ? { countryCode: countryCode.toUpperCase() } : {};
    return this.rules.find({ where, order: { createdAt: 'DESC' } });
  }

  async createPeriod(input: { label: string; startsOn: string; endsOn: string }, actor: JwtPayload) {
    this.assertMaster(actor);
    return this.periods.save(this.periods.create(input));
  }

  listPeriods() {
    return this.periods.find({ order: { startsOn: 'DESC' } });
  }

  async recordHours(
    hostProfileId: string,
    input: { periodId: string; liveHours: number; liveDays: number; beans?: number },
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    const host = await this.hostsService.findById(hostProfileId);
    await this.hostsService.assertWritable(host, actor, meta);
    const period = await this.periods.findOne({ where: { id: input.periodId } });
    if (!period) {
      throw new AppException('Period not found', HttpStatus.NOT_FOUND);
    }
    let line = await this.lines.findOne({
      where: { periodId: input.periodId, hostProfileId },
    });
    if (!line) {
      line = this.lines.create({
        periodId: input.periodId,
        hostProfileId,
        status: SalaryLineStatus.DRAFT,
      });
    }
    line.liveHours = input.liveHours;
    line.liveDays = input.liveDays;
    line.beans = input.beans ?? line.beans;
    return this.lines.save(line);
  }

  async calculate(periodId: string, actor: JwtPayload, meta?: RequestMetaDto) {
    this.assertMaster(actor);
    const period = await this.periods.findOne({ where: { id: periodId } });
    if (!period) {
      throw new AppException('Period not found', HttpStatus.NOT_FOUND);
    }

    const hosts = await this.hosts.find({ relations: ['agency'] });
    let hostTotal = 0;
    let agencyTotal = 0;
    let holdDays = 3;
    for (const host of hosts) {
      const country = await this.countries.findOne({ where: { code: host.country } });
      if (country?.payoutHoldDays != null) {
        holdDays = Math.min(holdDays, country.payoutHoldDays);
      }
    }
    const batch = await this.batches.save(
      this.batches.create({
        periodId,
        status: PayoutBatchStatus.CALCULATED,
        holdDays,
        hostTotal: 0,
        agencyTotal: 0,
      }),
    );

    for (const host of hosts) {
      const country = await this.countries.findOne({ where: { code: host.country } });
      const rule = await this.rules.findOne({
        where: { countryCode: host.country, isActive: true },
        order: { createdAt: 'DESC' },
      });
      let line = await this.lines.findOne({
        where: { periodId, hostProfileId: host.id },
      });
      if (!line) {
        line = this.lines.create({
          periodId,
          hostProfileId: host.id,
          liveHours: 0,
          liveDays: 0,
          beans: 0,
        });
      }

      const targetMet = Boolean(
        rule &&
          Number(line.liveHours) >= Number(rule.requiredHours) &&
          line.liveDays >= rule.requiredDays &&
          Number(line.beans) >= Number(rule.requiredBeans),
      );
      const earned = targetMet ? Number(rule?.salaryAmount ?? 0) : 0;
      let bonus = targetMet ? Number(rule?.bonusAmount ?? 0) : 0;

      const confirmed = await this.complaints.count({
        where: {
          targetId: host.id,
          targetType: 'host',
          status: ComplaintStatus.ACTION_TAKEN,
          salaryDeductFlag: true,
        },
      });
      let deductions = 0;
      if (confirmed >= 3 && bonus > 0) {
        deductions = bonus;
        bonus = 0;
        line.deductionReason = 'Confirmed complaint violations in period (3+)';
      }

      const sharePct = Number(rule?.agencySharePercent ?? host.agency?.sharePercent ?? 0);
      const agencyShare = host.agencyId ? Math.floor(((earned + bonus) * sharePct) / 100) : 0;

      line.ruleId = rule?.id;
      line.targetMet = targetMet;
      line.earned = earned;
      line.bonus = bonus;
      line.deductions = deductions;
      line.agencyShare = agencyShare;
      line.status = SalaryLineStatus.CALCULATED;
      line = await this.lines.save(line);

      const hostAmount = earned + bonus - deductions;
      hostTotal += hostAmount;
      agencyTotal += agencyShare;

      await this.items.save(
        this.items.create({
          batchId: batch.id,
          partyType: PayoutPartyType.HOST,
          partyId: host.id,
          salaryLineId: line.id,
          amount: hostAmount,
          systemValue: hostAmount,
          localCurrencyValue: hostAmount,
          localCurrency: country?.currency ?? 'PKR',
          corrections: [],
        }),
      );

      if (host.agencyId && agencyShare > 0) {
        await this.items.save(
          this.items.create({
            batchId: batch.id,
            partyType: PayoutPartyType.AGENCY,
            partyId: host.agencyId,
            salaryLineId: line.id,
            amount: agencyShare,
            systemValue: agencyShare,
            localCurrencyValue: agencyShare,
            localCurrency: country?.currency ?? 'PKR',
            corrections: [],
          }),
        );
      }
    }

    batch.hostTotal = hostTotal;
    batch.agencyTotal = agencyTotal;
    const saved = await this.batches.save(batch);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'payout.calculate',
      targetType: 'payout_batch',
      targetId: saved.id,
      after: { periodId, hostTotal, agencyTotal },
      meta,
    });
    return this.getBatch(saved.id);
  }

  async listBatches(query: PaginationQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const [rows, total] = await this.batches.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return new PaginatedResultDto(rows, total, page, limit);
  }

  async getBatch(id: string) {
    const batch = await this.batches.findOne({ where: { id } });
    if (!batch) {
      throw new AppException('Payout batch not found', HttpStatus.NOT_FOUND);
    }
    const items = await this.items.find({ where: { batchId: id }, order: { createdAt: 'ASC' } });
    return { ...batch, items };
  }

  async approveHold(id: string, actor: JwtPayload, meta?: RequestMetaDto) {
    this.assertMaster(actor);
    const batch = await this.batches.findOne({ where: { id } });
    if (!batch) {
      throw new AppException('Payout batch not found', HttpStatus.NOT_FOUND);
    }
    if (batch.status !== PayoutBatchStatus.CALCULATED) {
      throw new AppException('Batch must be in calculated status', HttpStatus.BAD_REQUEST);
    }
    const holdDays = batch.holdDays ?? 3;
    batch.status = PayoutBatchStatus.HOLDING;
    batch.holdApprovedAt = new Date();
    batch.holdApprovedById = actor.sub;
    batch.holdUntil = new Date(Date.now() + holdDays * 86400000);
    await this.batches.save(batch);
    await this.lines
      .createQueryBuilder()
      .update(SalaryLine)
      .set({ status: SalaryLineStatus.HOLDING })
      .where('"periodId" = :periodId', { periodId: batch.periodId })
      .execute();
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'payout.hold',
      targetType: 'payout_batch',
      targetId: id,
      after: { holdUntil: batch.holdUntil.toISOString(), holdDays },
      meta,
    });
    return this.getBatch(id);
  }

  async correctItem(
    batchId: string,
    itemId: string,
    newAmount: number,
    reason: string,
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    this.assertMaster(actor);
    const item = await this.items.findOne({ where: { id: itemId, batchId } });
    if (!item) {
      throw new AppException('Payout item not found', HttpStatus.NOT_FOUND);
    }
    const batch = await this.batches.findOne({ where: { id: batchId } });
    if (!batch || batch.status === PayoutBatchStatus.RELEASED) {
      throw new AppException('Cannot correct a released batch', HttpStatus.BAD_REQUEST);
    }
    const oldAmount = Number(item.amount);
    item.corrections = [
      ...item.corrections,
      {
        oldAmount,
        newAmount,
        reason,
        adminId: actor.sub,
        at: new Date().toISOString(),
      },
    ];
    item.amount = newAmount;
    item.systemValue = newAmount;
    await this.items.save(item);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'payout.correct',
      targetType: 'payout_item',
      targetId: itemId,
      reason,
      before: { amount: oldAmount },
      after: { amount: newAmount },
      meta,
    });
    return item;
  }

  async release(id: string, actor: JwtPayload, meta?: RequestMetaDto) {
    this.assertMaster(actor);
    const batch = await this.batches.findOne({ where: { id } });
    if (!batch) {
      throw new AppException('Payout batch not found', HttpStatus.NOT_FOUND);
    }
    if (batch.status !== PayoutBatchStatus.HOLDING) {
      throw new AppException('Batch must be holding before final release', HttpStatus.BAD_REQUEST);
    }
    if (batch.holdUntil && batch.holdUntil.getTime() > Date.now()) {
      throw new AppException(
        `Hold is active until ${batch.holdUntil.toISOString()}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const items = await this.items.find({ where: { batchId: id } });
    for (const item of items) {
      const amount = Number(item.amount);
      if (amount <= 0) {
        continue;
      }
      const ownerType =
        item.partyType === PayoutPartyType.HOST
          ? WalletOwnerType.HOST_SALARY
          : WalletOwnerType.AGENCY;
      await this.wallets.adjust({
        ownerType,
        ownerId: item.partyId,
        currency: WalletCurrency.COIN,
        direction: LedgerDirection.CREDIT,
        amount,
        type:
          item.partyType === PayoutPartyType.HOST
            ? LedgerType.SALARY_RELEASE
            : LedgerType.AGENCY_SHARE,
        actor: { type: ActorType.STAFF, id: actor.sub },
        refType: 'payout_batch',
        refId: batch.id,
        note: `Payout release ${batch.id}`,
        idempotencyKey: `payout:${batch.id}:${item.id}`,
      });
    }

    batch.status = PayoutBatchStatus.RELEASED;
    batch.releasedAt = new Date();
    batch.releasedById = actor.sub;
    await this.batches.save(batch);
    await this.lines
      .createQueryBuilder()
      .update(SalaryLine)
      .set({ status: SalaryLineStatus.RELEASED })
      .where('"periodId" = :periodId', { periodId: batch.periodId })
      .execute();

    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'payout.release',
      targetType: 'payout_batch',
      targetId: id,
      meta,
    });
    return this.getBatch(id);
  }

  async hostSalary(hostProfileId: string) {
    const lines = await this.lines.find({
      where: { hostProfileId },
      relations: ['period', 'rule'],
      order: { createdAt: 'DESC' },
    });
    const wallet = await this.wallets.getWallet(WalletOwnerType.HOST_SALARY, hostProfileId);
    return {
      wallet: { coinBalance: wallet.coinBalance, diamondBalance: wallet.diamondBalance },
      lines: lines.map((line) => ({
        id: line.id,
        period: line.period,
        liveHours: Number(line.liveHours),
        liveDays: line.liveDays,
        beans: Number(line.beans),
        targetMet: line.targetMet,
        earned: Number(line.earned),
        bonus: Number(line.bonus),
        deductions: Number(line.deductions),
        deductionReason: line.deductionReason,
        status: line.status,
        hold: line.status === SalaryLineStatus.HOLDING,
      })),
    };
  }

  async agencyShares(agencyId: string) {
    const items = await this.items.find({
      where: { partyType: PayoutPartyType.AGENCY, partyId: agencyId },
      order: { createdAt: 'DESC' },
    });
    const wallet = await this.wallets.getWallet(WalletOwnerType.AGENCY, agencyId);
    const total = items.reduce((sum, row) => sum + Number(row.amount), 0);
    return {
      wallet: { coinBalance: wallet.coinBalance },
      shareTotal: total,
      items: items.map((row) => ({
        id: row.id,
        batchId: row.batchId,
        amount: Number(row.amount),
        createdAt: row.createdAt,
      })),
    };
  }

  async pendingPayoutCount() {
    return this.batches.count({
      where: [
        { status: PayoutBatchStatus.CALCULATED },
        { status: PayoutBatchStatus.HOLDING },
      ],
    });
  }

  private assertMaster(actor: JwtPayload) {
    if (actor.role !== StaffRole.SUPER_ADMIN && !actor.roles?.includes(StaffRole.SUPER_ADMIN)) {
      throw new AppException('Master Admin only', HttpStatus.FORBIDDEN);
    }
  }
}
