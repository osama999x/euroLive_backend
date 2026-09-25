import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('user_sessions')
export class UserSession extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  deviceId?: string;

  @Column({ type: 'uuid', nullable: true })
  refreshTokenId?: string;

  @Column({ type: 'timestamptz' })
  lastSeenAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date;
}
