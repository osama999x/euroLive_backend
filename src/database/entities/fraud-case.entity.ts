import { Column, Entity, Index } from 'typeorm';
import { FraudCaseStatus } from '../../common/enums';
import { BaseEntity } from './base.entity';

@Entity('fraud_cases')
export class FraudCase extends BaseEntity {
  @Index({ unique: true })
  @Column()
  caseNumber: string;

  @Column({ type: 'uuid', nullable: true })
  freezeId?: string;

  @Column({ type: 'varchar' })
  ownerType: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'varchar' })
  signal: string;

  @Column({ type: 'varchar', default: FraudCaseStatus.OPEN })
  status: FraudCaseStatus;

  @Column({ type: 'jsonb', nullable: true })
  ledgerRefs?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  note?: string;
}
