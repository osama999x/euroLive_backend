import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ImmutableEntity } from './immutable.entity';
import { Complaint } from './complaint.entity';

@Entity('complaint_events')
export class ComplaintEvent extends ImmutableEntity {
  @Column({ type: 'uuid' })
  complaintId: string;

  @ManyToOne(() => Complaint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'complaintId' })
  complaint: Complaint;

  @Column()
  action: string;

  @Column({ type: 'uuid' })
  actorId: string;

  @Column({ type: 'varchar' })
  actorType: string;

  @Column({ type: 'text', nullable: true })
  note?: string;
}
