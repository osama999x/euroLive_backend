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

@Entity('activity_stats')
export class ActivityStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.activityStats)
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  profileViewsHis: number;

  @Column({ nullable: true })
  profileViewsOthers: number;

  @Column({ nullable: true })
  favourites: string;

  @Column({ nullable: true })
  numberOfCallViews: number;

  @Column({ default: false })
  activateCallCheck: boolean;

  @Column({ nullable: true })
  featuredStartDate: Date;

  @Column({ nullable: true })
  featuredEndDate: Date;

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

