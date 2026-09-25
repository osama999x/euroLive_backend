import { Column, Entity, Index } from 'typeorm';
import { ComplaintSeverity, ComplaintStatus, ComplaintType } from '../../common/enums';
import { BaseEntity } from './base.entity';

@Entity('complaints')
export class Complaint extends BaseEntity {
  @Index({ unique: true })
  @Column()
  caseNumber: string;

  @Column({ type: 'varchar' })
  type: ComplaintType;

  @Column({ type: 'varchar', default: ComplaintStatus.RECEIVED })
  status: ComplaintStatus;

  @Column({ type: 'varchar', default: ComplaintSeverity.MEDIUM })
  severity: ComplaintSeverity;

  @Column({ type: 'uuid' })
  reporterId: string;

  @Column({ type: 'varchar' })
  reporterType: string;

  @Column({ type: 'uuid' })
  targetId: string;

  @Column({ type: 'varchar' })
  targetType: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ default: false })
  protectionLock: boolean;

  @Column({ default: false })
  salaryDeductFlag: boolean;

  @Column({ type: 'uuid', nullable: true })
  reviewedById?: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date;
}
