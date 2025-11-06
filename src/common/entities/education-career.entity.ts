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

@Entity('education_career')
export class EducationCareer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.educationCareer)
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  qualification: string;

  @Column({ nullable: true })
  occupation: string;

  @Column({ nullable: true })
  monthlyIncome: string;

  @Column({ nullable: true })
  profession: string;

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

