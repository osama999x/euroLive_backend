import { Column, Entity, Index } from 'typeorm';
import { SosStatus } from '../../common/enums';
import { BaseEntity } from './base.entity';

@Entity('sos_alerts')
export class SosAlert extends BaseEntity {
  @Index({ unique: true })
  @Column()
  caseNumber: string;

  @Column({ type: 'uuid' })
  hostUserId: string;

  @Column({ type: 'uuid', nullable: true })
  roomId?: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'varchar', default: SosStatus.OPEN })
  status: SosStatus;

  @Column({ type: 'uuid', nullable: true })
  assignedResellerId?: string;

  @Column({ type: 'int', default: 5 })
  escalateAfterMinutes: number;

  @Column({ type: 'timestamptz' })
  escalateAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acknowledgedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  acknowledgedById?: string;

  @Column({ type: 'varchar', nullable: true })
  acknowledgedByType?: string;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  outcome?: string;

  @Column({ type: 'jsonb', default: [] })
  trail: Array<{ at: string; actorType: string; actorId: string; action: string; note?: string }>;
}
