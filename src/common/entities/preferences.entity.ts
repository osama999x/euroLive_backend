import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  BeforeInsert,
  BeforeUpdate,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('preferences')
export class Preferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.preferences)
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  ageLimit: string;

  @Column({ nullable: true })
  heightDemand: string;

  @Column({ nullable: true })
  casteDemand: string;

  @Column({ nullable: true })
  cityDemand: string;

  @Column({ nullable: true })
  housingDemandIn: string;

  @Column({ nullable: true })
  housingDemandArea: string;

  @Column({ nullable: true })
  housingDemandLocation: string;

  @Column({ nullable: true })
  housingDemandPossession: string;

  @Column({ nullable: true })
  professionDemand: string;

  @Column({ nullable: true })
  additionalDemand: string;

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

