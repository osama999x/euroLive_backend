import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import {
  ActorType,
  FreezeStatus,
  FreezeType,
  FraudCaseStatus,
  LedgerDirection,
  LedgerType,
  UserStatus,
  WalletCurrency,
  WalletOwnerType,
} from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { formatCaseNumber, getPagination } from '../../common/utils';
import { FraudCase, User } from '../../database/entities';
import { FreezeService } from '../security/freeze.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../../common/interfaces';
import { RequestMetaDto } from '../../common/decorators';

@Injectable()
export class FraudService {
  constructor(
    @InjectRepository(FraudCase)
    private readonly cases: Repository<FraudCase>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly freeze: FreezeService,
    private readonly wallets: WalletService,
    private readonly audit: AuditService,
  ) {}

  async openCase(input: {
    ownerType: string;
    ownerId: string;
    signal: string;
    freezeId?: string;
    ledgerRefs?: Record<string, unknown>;
  }) {
    const seq = (await this.cases.count()) + 1;
    return this.cases.save(
      this.cases.create({
        caseNumber: formatCaseNumber('FRD', seq),
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        signal: input.signal,
        freezeId: input.freezeId,
        ledgerRefs: input.ledgerRefs,
        status: FraudCaseStatus.OPEN,
      }),
    );
  }

  async list(query: PaginationQueryDto & { status?: FraudCaseStatus }) {
    const { skip, take, page, limit } = getPagination(query);
    const qb = this.cases.createQueryBuilder('row').orderBy('row.createdAt', 'DESC');
    if (query.status) {
      qb.andWhere('row.status = :status', { status: query.status });
    }
    const [items, total] = await qb.skip(skip).take(take).getManyAndCount();
    return new PaginatedResultDto(items, total, page, limit);
  }

  async review(
    id: string,
    action: 'restore' | 'correct' | 'penalty' | 'ban',
    actor: JwtPayload,
    input: { note?: string; amount?: number },
    meta?: RequestMetaDto,
  ) {
    const row = await this.cases.findOne({ where: { id } });
    if (!row) {
      throw new AppException('Fraud case not found', HttpStatus.NOT_FOUND);
    }

    if (action === 'restore') {
      row.status = FraudCaseStatus.RESTORED;
      if (row.freezeId) {
        await this.freeze.review(row.freezeId, 'restore', actor, input.note, meta);
      }
    } else if (action === 'correct') {
      if (!input.amount || input.amount < 1) {
        throw new AppException('Correction amount required', HttpStatus.BAD_REQUEST);
      }
      const ownerType = row.ownerType as WalletOwnerType;
      await this.wallets.adjust({
        ownerType,
        ownerId: row.ownerId,
        currency: WalletCurrency.COIN,
        direction: LedgerDirection.DEBIT,
        amount: input.amount,
        type: LedgerType.FRAUD_CORRECTION,
        actor: { type: ActorType.STAFF, id: actor.sub },
        note: input.note ?? row.caseNumber,
        refType: 'fraud_case',
        refId: row.id,
      });
      row.status = FraudCaseStatus.PENALIZED;
    } else if (action === 'penalty') {
      row.status = FraudCaseStatus.PENALIZED;
      if (row.freezeId) {
        await this.freeze.review(row.freezeId, 'confirm', actor, input.note, meta);
      }
    } else {
      row.status = FraudCaseStatus.BANNED;
      if (row.ownerType === WalletOwnerType.USER) {
        await this.users.update(row.ownerId, { status: UserStatus.BANNED });
      }
      if (row.freezeId) {
        await this.freeze.review(row.freezeId, 'ban', actor, input.note, meta);
      }
    }

    row.note = input.note;
    const saved = await this.cases.save(row);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: `fraud.${action}`,
      targetType: 'fraud_case',
      targetId: id,
      caseNumber: row.caseNumber,
      reason: input.note,
      meta,
    });
    return saved;
  }

  async flagIfNeeded(input: {
    ownerType: WalletOwnerType;
    ownerId: string;
    amount: number;
    direction: LedgerDirection;
    type: LedgerType;
    ledgerId?: string;
  }) {
    if (
      input.type === LedgerType.SALARY_RELEASE ||
      input.type === LedgerType.AGENCY_SHARE ||
      input.type === LedgerType.FRAUD_CORRECTION
    ) {
      return;
    }
    if (input.direction !== LedgerDirection.CREDIT) {
      return;
    }

    let signal: string | null = null;
    if (input.amount >= 100000) {
      signal = 'impossible_jump';
    }

    if (!signal && input.amount >= 20000) {
      signal = 'velocity';
    }

    if (!signal) {
      return;
    }

    const freeze = await this.freeze.freeze({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      freezeType: FreezeType.COINS,
      reason: `Fraud signal: ${signal}`,
      actorType: ActorType.SYSTEM,
      status: FreezeStatus.FROZEN,
    });

    await this.openCase({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      signal,
      freezeId: freeze.id,
      ledgerRefs: { ledgerId: input.ledgerId, amount: input.amount, type: input.type },
    });
  }
}
