import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  otp: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

