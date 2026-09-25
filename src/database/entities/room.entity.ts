import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { RoomStatus } from '../../common/enums';
import { BaseEntity } from './base.entity';
import { HostProfile } from './host-profile.entity';
import { CatalogItem } from './catalog-item.entity';

@Entity('rooms')
export class Room extends BaseEntity {
  @Column({ type: 'uuid' })
  hostProfileId: string;

  @ManyToOne(() => HostProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostProfileId' })
  host: HostProfile;

  @Column()
  title: string;

  @Column({ type: 'varchar', default: RoomStatus.OPEN })
  status: RoomStatus;

  @Column({ type: 'uuid', nullable: true })
  backgroundAssetId?: string;

  @ManyToOne(() => CatalogItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'backgroundAssetId' })
  background?: CatalogItem;
}
