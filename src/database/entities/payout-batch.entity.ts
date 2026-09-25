import { Column, Entity } from 'typeorm';
import { PayoutBatchStatus } from '../../common/enums';
import { bigintToNumber } from '../../common/utils';
import { BaseEntity } from './base.entity';

@Entity('payout_batches')
export class PayoutBatch extends BaseEntity {
  @Column({ type: 'uuid' })
  periodId: string;

  @Column({ type: 'varchar', default: PayoutBatchStatus.CALCULATED })
  status: PayoutBatchStatus;

  @Column({ type: 'int', default: 3 })
  holdDays: number;

  @Column({ type: 'timestamptz', nullable: true })
  holdUntil?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  holdApprovedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  holdApprovedById?: string;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  releasedById?: string;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  hostTotal: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  agencyTotal: number;

  @Column({ type: 'varchar', nullable: true })
  note?: string;
}
