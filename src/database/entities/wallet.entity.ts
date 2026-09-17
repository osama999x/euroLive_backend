import { Column, Entity, Index, Unique } from 'typeorm';
import { WalletOwnerType } from '../../common/enums';
import { bigintToNumber } from '../../common/utils';
import { BaseEntity } from './base.entity';

@Entity('wallets')
@Unique(['ownerType', 'ownerId'])
export class Wallet extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  ownerType: WalletOwnerType;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  coinBalance: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  diamondBalance: number;
}
