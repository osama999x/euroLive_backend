import { Column, Entity } from 'typeorm';
import { bigintToNumber } from '../../common/utils';
import { BaseEntity } from './base.entity';

@Entity('salary_target_rules')
export class SalaryTargetRule extends BaseEntity {
  @Column({ type: 'varchar', length: 2 })
  countryCode: string;

  @Column()
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, transformer: bigintToNumber })
  requiredHours: number;

  @Column({ type: 'int', default: 0 })
  requiredDays: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  requiredBeans: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  salaryAmount: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  bonusAmount: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0, transformer: bigintToNumber })
  agencySharePercent: number;

  @Column({ default: true })
  isActive: boolean;
}
