import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('countries')
export class Country {
  @PrimaryColumn({ type: 'varchar', length: 2 })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 8 })
  currency: string;

  @Column({ type: 'int', default: 3 })
  payoutHoldDays: number;

  @Column({ default: true })
  isActive: boolean;
}
