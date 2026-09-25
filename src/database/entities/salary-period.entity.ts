import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('salary_periods')
export class SalaryPeriod extends BaseEntity {
  @Column()
  label: string;

  @Column({ type: 'date' })
  startsOn: string;

  @Column({ type: 'date' })
  endsOn: string;

  @Column({ default: false })
  closed: boolean;
}
