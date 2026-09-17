import { Column, Entity, Index } from 'typeorm';
import { ActorType } from '../../common/enums';
import { BaseEntity } from './base.entity';

@Entity('admin_action_logs')
export class AdminActionLog extends BaseEntity {
  @Column({ type: 'varchar' })
  actorType: ActorType;

  @Index()
  @Column({ type: 'uuid' })
  actorId: string;

  @Index()
  @Column()
  action: string;

  @Column({ type: 'varchar', nullable: true })
  targetType?: string;

  @Column({ type: 'varchar', nullable: true })
  targetId?: string;

  @Column({ type: 'jsonb', nullable: true })
  before?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  after?: Record<string, unknown>;

  @Column({ type: 'varchar', nullable: true })
  ip?: string;

  @Column({ type: 'varchar', nullable: true })
  userAgent?: string;
}
