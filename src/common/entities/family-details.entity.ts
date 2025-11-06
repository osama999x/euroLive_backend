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

@Entity('family_details')
export class FamilyDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.familyDetails)
  @JoinColumn()
  user: User;

  @Column()
  fatherAlive: boolean;

  @Column({ nullable: true })
  fathersOccupation: string;

  @Column()
  motherAlive: boolean;

  @Column({ nullable: true })
  siblings: number;

  @Column({ nullable: true })
  marriedBrothers: number;

  @Column({ nullable: true })
  marriedSisters: number;

  @Column({ nullable: true })
  unmarriedBrothers: number;

  @Column({ nullable: true })
  unmarriedSisters: number;

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

