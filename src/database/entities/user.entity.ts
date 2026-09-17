import { Column, Entity, Index } from 'typeorm';
import { UserStatus } from '../../common/enums';
import { BaseEntity } from './base.entity';

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column()
  publicId: string;

  @Column({ unique: true })
  username: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  email?: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @Column()
  displayName: string;

  @Column({ type: 'varchar', nullable: true })
  country?: string;

  @Column({ type: 'varchar', nullable: true })
  gender?: string;

  @Column({ type: 'varchar', nullable: true })
  bio?: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'jsonb', default: [] })
  deviceIds: string[];
}
