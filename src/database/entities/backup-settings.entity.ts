import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('backup_settings')
export class BackupSettings extends BaseEntity {
  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'int', default: 24 })
  intervalHours: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  disabledReason?: string;
}
