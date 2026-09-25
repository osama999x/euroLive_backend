import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { PayoutPartyType } from '../../common/enums';
import { bigintToNumber } from '../../common/utils';
import { BaseEntity } from './base.entity';
import { PayoutBatch } from './payout-batch.entity';

@Entity('payout_batch_items')
export class PayoutBatchItem extends BaseEntity {
  @Column({ type: 'uuid' })
  batchId: string;

  @ManyToOne(() => PayoutBatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch: PayoutBatch;

  @Column({ type: 'varchar' })
  partyType: PayoutPartyType;

  @Column({ type: 'uuid' })
  partyId: string;

  @Column({ type: 'uuid', nullable: true })
  salaryLineId?: string;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  amount: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  systemValue: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0, transformer: bigintToNumber })
  localCurrencyValue: number;

  @Column({ type: 'varchar', nullable: true })
  localCurrency?: string;

  @Column({ type: 'jsonb', default: [] })
  corrections: Array<{
    oldAmount: number;
    newAmount: number;
    reason: string;
    adminId: string;
    at: string;
  }>;
}
