import { Column, Entity, Index } from 'typeorm';
import { CatalogItemType } from '../../common/enums';
import { bigintToNumber } from '../../common/utils';
import { BaseEntity } from './base.entity';

@Entity('catalog_items')
export class CatalogItem extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  type: CatalogItemType;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  assetUrl?: string;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  price: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  resellerAccess: boolean;

  @Column({ type: 'varchar', default: 'all' })
  eligibility: string;

  @Column({ type: 'int', nullable: true })
  defaultExpiryDays?: number;
}
