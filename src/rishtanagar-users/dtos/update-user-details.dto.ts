import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';

export class UpdateUserDetailsDto {
  @IsString()
  userId: string;

  // Personal Details
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  reasonForSecondMarriage?: string;

  @IsOptional()
  @IsString()
  marriagePeriod?: string;

  @IsOptional()
  @IsString()
  separationPeriod?: string;

  @IsOptional()
  @IsString()
  kids?: string;

  @IsOptional()
  @IsString()
  kidsOwnership?: string;

  // Family Details
  @IsOptional()
  @IsBoolean()
  fatherAlive?: boolean;

  @IsOptional()
  @IsString()
  fathersOccupation?: string;

  @IsOptional()
  @IsBoolean()
  motherAlive?: boolean;

  @IsOptional()
  @IsNumber()
  siblings?: number;

  @IsOptional()
  @IsNumber()
  marriedBrothers?: number;

  @IsOptional()
  @IsNumber()
  marriedSisters?: number;

  @IsOptional()
  @IsNumber()
  unmarriedBrothers?: number;

  @IsOptional()
  @IsNumber()
  unmarriedSisters?: number;

  // Location Housing
  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  houseIn?: string;

  @IsOptional()
  @IsString()
  houseArea?: string;

  @IsOptional()
  @IsString()
  possession?: string;

  // Education Career
  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  monthlyIncome?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  // Preferences
  @IsOptional()
  @IsString()
  ageLimit?: string;

  @IsOptional()
  @IsString()
  heightDemand?: string;

  @IsOptional()
  @IsString()
  casteDemand?: string;

  @IsOptional()
  @IsString()
  cityDemand?: string;

  @IsOptional()
  @IsString()
  housingDemandIn?: string;

  @IsOptional()
  @IsString()
  housingDemandArea?: string;

  @IsOptional()
  @IsString()
  housingDemandLocation?: string;

  @IsOptional()
  @IsString()
  housingDemandPossession?: string;

  @IsOptional()
  @IsString()
  professionDemand?: string;

  @IsOptional()
  @IsString()
  additionalDemand?: string;
}

