import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './providers/users.service';
import {
  User,
  Religion,
  UserResetPassword,
  PersonalDetails,
  FamilyDetails,
  LocationHousing,
  EducationCareer,
  Preferences,
  ActivityStats,
  UserImage,
  City,
} from '../common/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Religion,
      UserResetPassword,
      PersonalDetails,
      FamilyDetails,
      LocationHousing,
      EducationCareer,
      Preferences,
      ActivityStats,
      UserImage,
      City,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class RishtanagarUsersModule {}

