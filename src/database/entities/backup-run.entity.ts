import { Column, Entity } from 'typeorm';
import { BackupRunStatus } from '../../common/enums';
import { BaseEntity } from './base.entity';

@Entity('backup_runs')
export class BackupRun extends BaseEntity {
  @Column({ type: 'varchar', default: BackupRunStatus.RUNNING })
  status: BackupRunStatus;

  @Column({ default: false })
  manual: boolean;

  @Column({ type: 'varchar', nullable: true })
  path?: string;

  @Column({ type: 'jsonb', nullable: true })
  snapshot?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'uuid', nullable: true })
  triggeredById?: string;
}
