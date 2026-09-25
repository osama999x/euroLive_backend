import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { EvidenceType } from '../../common/enums';
import { BaseEntity } from './base.entity';
import { Complaint } from './complaint.entity';

@Entity('complaint_evidence')
export class ComplaintEvidence extends BaseEntity {
  @Column({ type: 'uuid' })
  complaintId: string;

  @ManyToOne(() => Complaint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'complaintId' })
  complaint: Complaint;

  @Column({ type: 'varchar' })
  type: EvidenceType;

  @Column()
  url: string;
}
