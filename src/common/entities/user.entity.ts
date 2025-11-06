import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Religion } from './religion.entity';
import { PersonalDetails } from './personal-details.entity';
import { FamilyDetails } from './family-details.entity';
import { LocationHousing } from './location-housing.entity';
import { EducationCareer } from './education-career.entity';
import { Preferences } from './preferences.entity';
import { ActivityStats } from './activity-stats.entity';
import { UserImage } from './user-image.entity';
import { GenderEnum, ProfileForEnum } from '../enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: false })
  phone: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: false })
  password: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isActiveAccount: boolean;

  @ManyToOne(() => Religion, (religion) => religion.users, { nullable: false })
  religion: Religion;

  @Column({ type: 'enum', enum: GenderEnum, nullable: false })
  gender: GenderEnum;

  @Column({ default: false })
  isDeletedAccount?: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: false })
  isPaidUser: boolean;

  @Column({ nullable: true })
  packageType: string;

  @Column({ nullable: true })
  paymentStartDate: Date;

  @Column({ nullable: true })
  paymentEndDate: Date;

  @Column({ nullable: true })
  token: string;

  @Column({ nullable: true })
  fcmToken: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdDate: Date;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  updatedDate: Date;

  @Column({ type: 'enum', enum: ProfileForEnum, nullable: false })
  profileFor: ProfileForEnum;

  @BeforeInsert()
  updateCreatedDate() {
    this.createdDate = new Date();
  }

  @BeforeUpdate()
  updateUpdatedDate() {
    this.updatedDate = new Date();
  }

  @OneToOne(() => PersonalDetails, (personalDetails) => personalDetails.user)
  personalDetails: PersonalDetails;

  @OneToOne(() => FamilyDetails, (familyDetails) => familyDetails.user)
  familyDetails: FamilyDetails;

  @OneToOne(() => LocationHousing, (locationHousing) => locationHousing.user)
  locationHousing: LocationHousing;

  @OneToOne(() => EducationCareer, (educationCareer) => educationCareer.user)
  educationCareer: EducationCareer;

  @OneToOne(() => Preferences, (preferences) => preferences.user)
  preferences: Preferences;

  @OneToOne(() => ActivityStats, (activityStats) => activityStats.user)
  activityStats: ActivityStats;

  @OneToMany(() => UserImage, (userImages) => userImages.userId)
  profileImages: UserImage[];
}

