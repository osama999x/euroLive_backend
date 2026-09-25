import { Column, Entity } from 'typeorm';
import { AgencyStatus } from '../../common/enums';
import { bigintToNumber } from '../../common/utils';
import { BaseEntity } from './base.entity';

@Entity('agencies')
export class Agency extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  displayName: string;

  @Column({ type: 'varchar', length: 2 })
  country: string;

  @Column({ type: 'varchar', default: AgencyStatus.ACTIVE })
  status: AgencyStatus;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0, transformer: bigintToNumber })
  sharePercent: number;

  @Column({ default: false })
  frozen: boolean;
}
