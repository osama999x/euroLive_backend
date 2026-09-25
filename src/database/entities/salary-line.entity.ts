import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SalaryLineStatus } from '../../common/enums';
import { bigintToNumber } from '../../common/utils';
import { BaseEntity } from './base.entity';
import { HostProfile } from './host-profile.entity';
import { SalaryPeriod } from './salary-period.entity';
import { SalaryTargetRule } from './salary-target-rule.entity';

@Entity('salary_lines')
@Index(['periodId', 'hostProfileId'], { unique: true })
export class SalaryLine extends BaseEntity {
  @Column({ type: 'uuid' })
  periodId: string;

  @ManyToOne(() => SalaryPeriod, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'periodId' })
  period: SalaryPeriod;

  @Column({ type: 'uuid' })
  hostProfileId: string;

  @ManyToOne(() => HostProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostProfileId' })
  host: HostProfile;

  @Column({ type: 'uuid', nullable: true })
  ruleId?: string;

  @ManyToOne(() => SalaryTargetRule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ruleId' })
  rule?: SalaryTargetRule;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, transformer: bigintToNumber })
  liveHours: number;

  @Column({ type: 'int', default: 0 })
  liveDays: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  beans: number;

  @Column({ default: false })
  targetMet: boolean;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  earned: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  bonus: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  deductions: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  agencyShare: number;

  @Column({ type: 'varchar', default: SalaryLineStatus.DRAFT })
  status: SalaryLineStatus;

  @Column({ type: 'varchar', nullable: true })
  deductionReason?: string;

  @Column({ type: 'varchar', nullable: true })
  deductionCaseNumber?: string;
}
