import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import {
  ActorType,
  CatalogItemType,
  UserItemSource,
  UserItemStatus,
} from '../../common/enums';
import { BaseEntity } from './base.entity';
import { CatalogItem } from './catalog-item.entity';

@Entity('user_items')
export class UserItem extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  catalogItemId: string;

  @ManyToOne(() => CatalogItem, { eager: true })
  @JoinColumn({ name: 'catalogItemId' })
  catalogItem: CatalogItem;

  @Column({ type: 'varchar' })
  itemType: CatalogItemType;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Index()
  @Column({ type: 'varchar', default: UserItemStatus.ACTIVE })
  status: UserItemStatus;

  @Column({ type: 'varchar' })
  source: UserItemSource;

  @Column({ type: 'varchar' })
  assignedByType: ActorType;

  @Column({ type: 'uuid', nullable: true })
  assignedById?: string;

  @Column({ type: 'varchar', nullable: true })
  durationLabel?: string;
}
