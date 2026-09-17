import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import { AccountStatus } from '../../common/enums';
import { BaseEntity } from './base.entity';
import { Role } from './role.entity';

@Entity('staff_users')
export class StaffUser extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  totpSecret?: string | null;

  @Column({ default: false })
  totpEnabled: boolean;

  @Column({ type: 'varchar', default: AccountStatus.ACTIVE })
  status: AccountStatus;

  @ManyToMany(() => Role, (role) => role.staffUsers, { eager: true })
  @JoinTable({
    name: 'staff_user_roles',
    joinColumn: { name: 'staffUserId' },
    inverseJoinColumn: { name: 'roleId' },
  })
  roles: Role[];
}
