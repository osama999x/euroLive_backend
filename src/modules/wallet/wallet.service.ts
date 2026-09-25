import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { AppException } from '../../common/exceptions';
import {
  ActorType,
  FreezeStatus,
  FreezeType,
  FraudCaseStatus,
  LedgerDirection,
  LedgerType,
  WalletCurrency,
  WalletOwnerType,
} from '../../common/enums';
import { FraudCase, LedgerEntry, Wallet } from '../../database/entities';
import { FreezeService } from '../security/freeze.service';
import { formatCaseNumber } from '../../common/utils';
import { nextBalance } from './wallet.util';

export interface LedgerActor {
  type: ActorType;
  id?: string;
}

export interface AdjustWalletInput {
  ownerType: WalletOwnerType;
  ownerId: string;
  currency: WalletCurrency;
  direction: LedgerDirection;
  amount: number;
  type: LedgerType;
  actor: LedgerActor;
  creditLimit?: number;
  note?: string;
  idempotencyKey?: string;
  refType?: string;
  refId?: string;
  metadata?: Record<string, unknown>;
}

export interface TransferCoinsInput {
  resellerId: string;
  userId: string;
  amount: number;
  creditLimit: number;
  actor: LedgerActor;
  idempotencyKey?: string;
  note?: string;
}

@Injectable()
export class WalletService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Wallet)
    private readonly wallets: Repository<Wallet>,
    @InjectRepository(LedgerEntry)
    private readonly ledger: Repository<LedgerEntry>,
    @InjectRepository(FraudCase)
    private readonly fraudCases: Repository<FraudCase>,
    private readonly freeze: FreezeService,
  ) {}

  async getOrCreateWallet(
    ownerType: WalletOwnerType,
    ownerId: string,
    manager?: EntityManager,
  ): Promise<Wallet> {
    const repo = manager ? manager.getRepository(Wallet) : this.wallets;
    const existing = await repo.findOne({ where: { ownerType, ownerId } });
    if (existing) {
      return existing;
    }

    const created = repo.create({
      ownerType,
      ownerId,
      coinBalance: 0,
      diamondBalance: 0,
    });

    try {
      return await repo.save(created);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const raced = await repo.findOne({ where: { ownerType, ownerId } });
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  async getWallet(ownerType: WalletOwnerType, ownerId: string): Promise<Wallet> {
    return this.getOrCreateWallet(ownerType, ownerId);
  }

  async adjust(input: AdjustWalletInput): Promise<LedgerEntry> {
    return this.dataSource.transaction(async (manager) => {
      if (input.idempotencyKey) {
        const replay = await this.findByIdempotency(manager, input.idempotencyKey);
        if (replay) {
          return replay;
        }
      }

      try {
        return await this.applyAdjustment(manager, input);
      } catch (error) {
        if (input.idempotencyKey && this.isUniqueViolation(error)) {
          const replay = await this.findByIdempotency(manager, input.idempotencyKey);
          if (replay) {
            return replay;
          }
        }
        throw error;
      }
    });
  }

  async transferResellerToUser(input: TransferCoinsInput): Promise<{
    debit: LedgerEntry;
    credit: LedgerEntry;
  }> {
    return this.dataSource.transaction(async (manager) => {
      if (input.idempotencyKey) {
        const replay = await this.findByIdempotency(manager, input.idempotencyKey);
        if (replay) {
          const credit = await manager.getRepository(LedgerEntry).findOne({
            where: {
              refId: replay.refId,
              type: LedgerType.RESELLER_TRANSFER_IN,
            },
          });
          if (credit) {
            return { debit: replay, credit };
          }
        }
      }

      const resellerWallet = await this.getOrCreateWallet(
        WalletOwnerType.RESELLER,
        input.resellerId,
        manager,
      );
      const userWallet = await this.getOrCreateWallet(
        WalletOwnerType.USER,
        input.userId,
        manager,
      );

      const ids = [resellerWallet.id, userWallet.id].sort();
      for (const id of ids) {
        await this.lockWallet(manager, id);
      }

      const lockedReseller = await manager.getRepository(Wallet).findOneByOrFail({
        id: resellerWallet.id,
      });
      const lockedUser = await manager.getRepository(Wallet).findOneByOrFail({
        id: userWallet.id,
      });

      const transferId = input.idempotencyKey ?? crypto.randomUUID();

      await this.freeze.assertNotFrozen(WalletOwnerType.RESELLER, input.resellerId);
      await this.freeze.assertNotFrozen(WalletOwnerType.USER, input.userId);

      let debit: LedgerEntry;
      try {
        debit = await this.applyOnLockedWallet(manager, {
          wallet: lockedReseller,
          currency: WalletCurrency.COIN,
          direction: LedgerDirection.DEBIT,
          amount: input.amount,
          type: LedgerType.RESELLER_TRANSFER_OUT,
          actor: input.actor,
          creditLimit: input.creditLimit,
          note: input.note,
          idempotencyKey: input.idempotencyKey,
          refType: 'reseller_transfer',
          refId: transferId,
          metadata: { userId: input.userId, resellerId: input.resellerId },
        });
      } catch (error) {
        if (input.idempotencyKey && this.isUniqueViolation(error)) {
          const replay = await this.findByIdempotency(manager, input.idempotencyKey);
          if (replay) {
            const credit = await manager.getRepository(LedgerEntry).findOne({
              where: {
                refId: replay.refId,
                type: LedgerType.RESELLER_TRANSFER_IN,
              },
            });
            if (credit) {
              return { debit: replay, credit };
            }
          }
        }
        throw error;
      }

      const credit = await this.applyOnLockedWallet(manager, {
        wallet: lockedUser,
        currency: WalletCurrency.COIN,
        direction: LedgerDirection.CREDIT,
        amount: input.amount,
        type: LedgerType.RESELLER_TRANSFER_IN,
        actor: input.actor,
        creditLimit: 0,
        note: input.note,
        refType: 'reseller_transfer',
        refId: transferId,
        metadata: { userId: input.userId, resellerId: input.resellerId },
      });

      return { debit, credit };
    });
  }

  async listEntries(
    walletId: string,
    skip: number,
    take: number,
  ): Promise<[LedgerEntry[], number]> {
    return this.ledger.findAndCount({
      where: { walletId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async sumDebitsSince(
    walletId: string,
    type: LedgerType,
    since: Date,
  ): Promise<number> {
    const raw = await this.ledger
      .createQueryBuilder('entry')
      .select('COALESCE(SUM(entry.amount), 0)', 'total')
      .where('entry.walletId = :walletId', { walletId })
      .andWhere('entry.type = :type', { type })
      .andWhere('entry.direction = :direction', {
        direction: LedgerDirection.DEBIT,
      })
      .andWhere('entry.createdAt >= :since', { since })
      .getRawOne<{ total: string }>();

    return Number(raw?.total ?? 0);
  }

  private async applyAdjustment(
    manager: EntityManager,
    input: AdjustWalletInput,
  ): Promise<LedgerEntry> {
    const wallet = await this.getOrCreateWallet(
      input.ownerType,
      input.ownerId,
      manager,
    );
    await this.lockWallet(manager, wallet.id);
    const locked = await manager.getRepository(Wallet).findOneByOrFail({
      id: wallet.id,
    });

    if (
      input.type !== LedgerType.FRAUD_CORRECTION &&
      input.type !== LedgerType.SALARY_RELEASE &&
      input.type !== LedgerType.AGENCY_SHARE
    ) {
      await this.freeze.assertNotFrozen(input.ownerType, input.ownerId);
    }

    return this.applyOnLockedWallet(manager, {
      wallet: locked,
      currency: input.currency,
      direction: input.direction,
      amount: input.amount,
      type: input.type,
      actor: input.actor,
      creditLimit: input.creditLimit ?? 0,
      note: input.note,
      idempotencyKey: input.idempotencyKey,
      refType: input.refType,
      refId: input.refId,
      metadata: input.metadata,
    });
  }

  private async applyOnLockedWallet(
    manager: EntityManager,
    params: {
      wallet: Wallet;
      currency: WalletCurrency;
      direction: LedgerDirection;
      amount: number;
      type: LedgerType;
      actor: LedgerActor;
      creditLimit: number;
      note?: string;
      idempotencyKey?: string;
      refType?: string;
      refId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<LedgerEntry> {
    const field =
      params.currency === WalletCurrency.DIAMOND ? 'diamondBalance' : 'coinBalance';
    const current = params.wallet[field];

    let next: number;
    try {
      next = nextBalance(current, params.direction, params.amount, params.creditLimit);
    } catch (error) {
      throw new AppException(
        error instanceof Error ? error.message : 'Wallet operation failed',
        HttpStatus.BAD_REQUEST,
      );
    }

    params.wallet[field] = next;
    await manager.getRepository(Wallet).save(params.wallet);

    const entry = manager.getRepository(LedgerEntry).create({
      walletId: params.wallet.id,
      type: params.type,
      currency: params.currency,
      direction: params.direction,
      amount: params.amount,
      balanceAfter: next,
      refType: params.refType,
      refId: params.refId,
      idempotencyKey: params.idempotencyKey,
      performedByType: params.actor.type,
      performedById: params.actor.id,
      note: params.note,
      metadata: params.metadata,
    });

    const saved = await manager.getRepository(LedgerEntry).save(entry);
    await this.flagFraud(params.wallet, saved);
    return saved;
  }

  private async flagFraud(wallet: Wallet, entry: LedgerEntry): Promise<void> {
    if (
      entry.direction !== LedgerDirection.CREDIT ||
      entry.type === LedgerType.SALARY_RELEASE ||
      entry.type === LedgerType.AGENCY_SHARE ||
      entry.type === LedgerType.FRAUD_CORRECTION
    ) {
      return;
    }

    let signal: string | null = null;
    if (entry.amount >= 100000) {
      signal = 'impossible_jump';
    } else if (entry.amount >= 50000) {
      signal = 'velocity';
    }
    if (!signal) {
      return;
    }

    const freeze = await this.freeze.freeze({
      ownerType: wallet.ownerType,
      ownerId: wallet.ownerId,
      freezeType: FreezeType.COINS,
      reason: `Fraud signal: ${signal}`,
      actorType: ActorType.SYSTEM,
      status: FreezeStatus.FROZEN,
    });
    const seq = (await this.fraudCases.count()) + 1;
    await this.fraudCases.save(
      this.fraudCases.create({
        caseNumber: formatCaseNumber('FRD', seq),
        ownerType: wallet.ownerType,
        ownerId: wallet.ownerId,
        signal,
        freezeId: freeze.id,
        ledgerRefs: { ledgerId: entry.id, amount: entry.amount, type: entry.type },
        status: FraudCaseStatus.OPEN,
      }),
    );
  }

  private async lockWallet(manager: EntityManager, walletId: string): Promise<void> {
    await manager
      .createQueryBuilder(Wallet, 'wallet')
      .setLock('pessimistic_write')
      .where('wallet.id = :walletId', { walletId })
      .getOne();
  }

  private async findByIdempotency(
    manager: EntityManager,
    key: string,
  ): Promise<LedgerEntry | null> {
    return manager.getRepository(LedgerEntry).findOne({
      where: { idempotencyKey: key },
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    if (error instanceof QueryFailedError) {
      const code = (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code;
      return code === '23505';
    }
    return (error as { code?: string })?.code === '23505';
  }
}
