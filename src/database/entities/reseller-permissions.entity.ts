import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Reseller } from './reseller.entity';

@Entity('reseller_permissions')
export class ResellerPermissions extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  resellerId: string;

  @OneToOne(() => Reseller, (reseller) => reseller.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resellerId' })
  reseller: Reseller;

  @Column({ default: false })
  canRecharge: boolean;

  @Column({ default: false })
  canAssignFrame: boolean;

  @Column({ default: false })
  canAssignEntry: boolean;

  @Column({ default: false })
  canAssignBadge: boolean;

  @Column({ default: false })
  canRemove: boolean;

  @Column({ default: false })
  canSetExpiry: boolean;

  @Column({ type: 'int', nullable: true })
  dailyRechargeLimit?: number;

  @Column({ type: 'int', nullable: true })
  dailyFrameLimit?: number;

  @Column({ type: 'int', nullable: true })
  dailyEntryLimit?: number;

  @Column({ type: 'int', nullable: true })
  dailyBadgeLimit?: number;
}
