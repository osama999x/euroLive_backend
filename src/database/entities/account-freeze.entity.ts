import { Column, Entity, Index } from 'typeorm';
import { FreezeStatus, FreezeType } from '../../common/enums';
import { BaseEntity } from './base.entity';

@Entity('account_freezes')
export class AccountFreeze extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  ownerType: string;

  @Index()
  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'varchar' })
  freezeType: FreezeType;

  @Column({ type: 'varchar', default: FreezeStatus.PENDING_REVIEW })
  status: FreezeStatus;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string;

  @Column({ type: 'varchar', nullable: true })
  createdByType?: string;

  @Column({ type: 'uuid', nullable: true })
  reviewedById?: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  reviewNote?: string;
}
