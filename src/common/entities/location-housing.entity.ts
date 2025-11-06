import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { City } from './city.entity';

@Entity('location_housing')
export class LocationHousing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.locationHousing)
  @JoinColumn()
  user: User;

  @ManyToOne(() => City, (city) => city.locations, { nullable: false })
  @JoinColumn({ name: 'cityId' })
  city: City;

  @Column()
  address: string;

  @Column({ nullable: true })
  area: string;

  @Column({ nullable: true })
  houseIn: string;

  @Column({ nullable: true })
  houseArea: string;

  @Column({ nullable: true })
  possession: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdDate: Date;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  updatedDate: Date;

  @BeforeInsert()
  updateCreatedDate() {
    this.createdDate = new Date();
  }

  @BeforeUpdate()
  updateUpdatedDate() {
    this.updatedDate = new Date();
  }
}

