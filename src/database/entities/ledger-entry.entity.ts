import { Column, Entity, Index } from 'typeorm';
import {
  ActorType,
  LedgerDirection,
  LedgerType,
  WalletCurrency,
} from '../../common/enums';
import { bigintToNumber } from '../../common/utils';
import { BaseEntity } from './base.entity';

@Entity('ledger_entries')
export class LedgerEntry extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  walletId: string;

  @Column({ type: 'varchar' })
  type: LedgerType;

  @Column({ type: 'varchar' })
  currency: WalletCurrency;

  @Column({ type: 'varchar' })
  direction: LedgerDirection;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  amount: number;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  balanceAfter: number;

  @Column({ type: 'varchar', nullable: true })
  refType?: string;

  @Column({ type: 'varchar', nullable: true })
  refId?: string;

  @Index({ unique: true, where: '"idempotencyKey" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  idempotencyKey?: string;

  @Column({ type: 'varchar' })
  performedByType: ActorType;

  @Column({ type: 'uuid', nullable: true })
  performedById?: string;

  @Column({ type: 'varchar', nullable: true })
  note?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;
}
