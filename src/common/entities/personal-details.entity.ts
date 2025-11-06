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

@Entity('personal_details')
export class PersonalDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.personalDetails)
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  maritalStatus: string;

  @Column({ nullable: true })
  reasonForSecondMarriage: string;

  @Column({ nullable: true })
  marriagePeriod: string;

  @Column({ nullable: true })
  separationPeriod: string;

  @Column({ nullable: true })
  kids: string;

  @Column({ nullable: true })
  kidsOwnership: string;

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

