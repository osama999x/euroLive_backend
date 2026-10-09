import { Column, Entity, Index } from 'typeorm';
import { BanType } from '../../common/enums';
import { BaseEntity } from './base.entity';

@Entity('user_bans')
export class UserBan extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  deviceId?: string;

  @Column({ type: 'varchar' })
  type: BanType;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string;
}
