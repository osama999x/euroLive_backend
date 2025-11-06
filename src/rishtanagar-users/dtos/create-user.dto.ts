import { IsNotEmpty, IsString, IsEmail, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { GenderEnum, ProfileForEnum } from '../../common/enums';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  isActiveAccount?: boolean;

  @IsNotEmpty()
  @IsString()
  religionId: string;

  @IsNotEmpty()
  @IsEnum(GenderEnum)
  gender: GenderEnum;

  @IsNotEmpty()
  @IsEnum(ProfileForEnum)
  profileFor: ProfileForEnum;

  @IsOptional()
  @IsString()
  fcmToken?: string;

  @IsOptional()
  profileImages?: string[];
}

