import { Column, Entity, Index } from 'typeorm';
import { AccountType } from '../../common/enums';
import { BaseEntity } from './base.entity';

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column({ type: 'varchar' })
  accountType: AccountType;

  @Index()
  @Column({ type: 'uuid' })
  accountId: string;

  @Column({ unique: true })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date;
}
