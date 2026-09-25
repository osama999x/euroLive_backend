import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { HostStatus } from '../../common/enums';
import { BaseEntity } from './base.entity';
import { Agency } from './agency.entity';
import { User } from './user.entity';

@Entity('host_profiles')
export class HostProfile extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.hostProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  agencyId?: string;

  @ManyToOne(() => Agency, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agencyId' })
  agency?: Agency;

  @Column({ type: 'varchar', length: 2 })
  country: string;

  @Column({ type: 'varchar', default: HostStatus.ACTIVE })
  status: HostStatus;

  @Column({ select: false, type: 'varchar', nullable: true })
  salaryPinHash?: string;

  @Column({ type: 'timestamptz', nullable: true })
  protectionLockedUntil?: Date;

  @Column({ type: 'varchar', nullable: true })
  protectionReason?: string;

  @Column({ type: 'varchar', nullable: true })
  protectionCaseNumber?: string;
}
