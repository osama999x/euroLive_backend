import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('user_devices')
@Index(['userId', 'deviceId'], { unique: true })
export class UserDevice extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column()
  deviceId: string;

  @Column({ type: 'varchar', nullable: true })
  deviceName?: string;

  @Column({ type: 'timestamptz' })
  lastSeenAt: Date;

  @Column({ default: false })
  isNew: boolean;
}
