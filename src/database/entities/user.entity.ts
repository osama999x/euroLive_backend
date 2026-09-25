import { Column, Entity, Index, OneToOne } from 'typeorm';
import { UserStatus } from '../../common/enums';
import { BaseEntity } from './base.entity';
import { HostProfile } from './host-profile.entity';

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

  @Column({ select: false, type: 'varchar', nullable: true })
  passwordHash?: string;

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

  @Column({ default: false })
  isOfficial: boolean;

  @Column({ type: 'varchar', nullable: true, unique: true })
  officialId?: string;

  @Column({ type: 'jsonb', default: [] })
  deviceIds: string[];

  @OneToOne(() => HostProfile, (profile) => profile.user)
  hostProfile?: HostProfile;
}
