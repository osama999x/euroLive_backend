import { Column, Entity, OneToOne } from 'typeorm';
import { AccountStatus } from '../../common/enums';
import { bigintToNumber } from '../../common/utils';
import { BaseEntity } from './base.entity';
import { ResellerPermissions } from './reseller-permissions.entity';

@Entity('resellers')
export class Reseller extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  displayName: string;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  creditLimit: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0, transformer: bigintToNumber })
  commissionRate: number;

  @Column({ type: 'varchar', default: AccountStatus.ACTIVE })
  status: AccountStatus;

  @Column({ default: false })
  isOfficial: boolean;

  @Column({ type: 'varchar', nullable: true, unique: true })
  officialId?: string;

  @OneToOne(() => ResellerPermissions, (permissions) => permissions.reseller)
  permissions?: ResellerPermissions;
}
