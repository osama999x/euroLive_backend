import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  Religion,
  UserResetPassword,
  PersonalDetails,
  FamilyDetails,
  LocationHousing,
  EducationCareer,
  Preferences,
  City,
} from '../../common/entities';
import { PasswordHashUtil, GenerateOtpUtil } from '../../common/utils';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UpdateUserDetailsDto } from '../dtos/update-user-details.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Religion)
    private readonly religionRepository: Repository<Religion>,
    @InjectRepository(UserResetPassword)
    private readonly userResetPasswordRepository: Repository<UserResetPassword>,
    @InjectRepository(PersonalDetails)
    private readonly personalDetailsRepository: Repository<PersonalDetails>,
    @InjectRepository(FamilyDetails)
    private readonly familyDetailsRepository: Repository<FamilyDetails>,
    @InjectRepository(LocationHousing)
    private readonly locationHousingRepository: Repository<LocationHousing>,
    @InjectRepository(EducationCareer)
    private readonly educationCareerRepository: Repository<EducationCareer>,
    @InjectRepository(Preferences)
    private readonly preferencesRepository: Repository<Preferences>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check for duplicate
    const duplicatePhone = await this.userRepository.findOne({
      where: { phone: createUserDto.phone },
    });

    if (duplicatePhone) {
      throw new BadRequestException('Phone number already exists');
    }

    const duplicateEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (duplicateEmail) {
      throw new BadRequestException('Email already exists');
    }

    // Find religion
    const religion = await this.religionRepository.findOne({
      where: { id: createUserDto.religionId },
    });

    if (!religion) {
      throw new NotFoundException('Religion not found');
    }

    // Hash password
    const hashedPassword = await PasswordHashUtil.hash(createUserDto.password);

    // Create user (exclude profileImages and religionId as they're handled separately)
    const { profileImages, religionId, ...userData } = createUserDto;
    
    const user = this.userRepository.create({
      ...userData,
      password: hashedPassword,
      religion,
    });

    return await this.userRepository.save(user);
  }

  async getAll(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['religion'],
    });
  }

  async getById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
        'religion',
        'personalDetails',
        'familyDetails',
        'locationHousing',
        'locationHousing.city',
        'educationCareer',
        'preferences',
        'activityStats',
        'profileImages',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['religion'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getById(id);

    if (updateUserDto.password) {
      updateUserDto.password = await PasswordHashUtil.hash(
        updateUserDto.password,
      );
    }

    if (updateUserDto.religionId) {
      const religion = await this.religionRepository.findOne({
        where: { id: updateUserDto.religionId },
      });
      if (!religion) {
        throw new NotFoundException('Religion not found');
      }
      user.religion = religion;
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.getById(id);
    await this.userRepository.softDelete(id);
  }

  async sendOtp(
    phone: string,
    email?: string,
    purpose?: string,
  ): Promise<boolean> {
    try {
      const { otp, expirationTime } = GenerateOtpUtil.generate();

      console.log('Generated OTP:', otp);

      // Store OTP in database
      const otpData = this.userResetPasswordRepository.create({
        email: email || '',
        phone,
        otp,
        expireOtp: expirationTime,
      });

      await this.userResetPasswordRepository.save(otpData);

      // In a real application, send email/SMS here
      // For now, we'll just log it
      console.log(`OTP ${otp} sent to ${phone} (${email})`);

      return true;
    } catch (error) {
      console.error('Error generating and sending OTP:', error);
      return false;
    }
  }

  async verifyOtp(
    phone: string,
    otp: string,
    email?: string,
  ): Promise<boolean> {
    const otpRecord = await this.userResetPasswordRepository.findOne({
      where: {
        phone,
        otp,
        ...(email && { email }),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      return false;
    }

    const now = new Date();
    if (now > otpRecord.expireOtp) {
      return false;
    }

    // Delete used OTP
    await this.userResetPasswordRepository.delete(otpRecord.id);

    return true;
  }

  async resetPassword(phone: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { phone },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = await PasswordHashUtil.hash(password);
    return await this.userRepository.save(user);
  }

  async updateByEmail(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = await PasswordHashUtil.hash(password);
    return await this.userRepository.save(user);
  }

  async logOut(id: string): Promise<boolean> {
    const user = await this.getById(id);
    user.fcmToken = null;
    await this.userRepository.save(user);
    return true;
  }

  async updateTokenAndReferral(id: string, fcmToken?: string): Promise<void> {
    const user = await this.getById(id);
    if (fcmToken) {
      user.fcmToken = fcmToken;
    }
    await this.userRepository.save(user);
  }

  async duplicateCheck(phone: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { phone, isActiveAccount: true, isVerified: true },
      order: { createdDate: 'DESC' },
    });
  }

  async checkEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  async accountActiveCheck(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { email, isActiveAccount: false },
    });
    return !!user;
  }

  async addOrUpdateUserDetails(
    userId: string,
    updateUserDetailsDto: UpdateUserDetailsDto,
  ): Promise<boolean> {
    const user = await this.getById(userId);

    // Update Personal Details
    if (
      updateUserDetailsDto.maritalStatus ||
      updateUserDetailsDto.reasonForSecondMarriage ||
      updateUserDetailsDto.marriagePeriod
    ) {
      let personalDetails = await this.personalDetailsRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!personalDetails) {
        personalDetails = this.personalDetailsRepository.create({
          user,
        });
      }

      Object.assign(personalDetails, {
        maritalStatus: updateUserDetailsDto.maritalStatus,
        reasonForSecondMarriage: updateUserDetailsDto.reasonForSecondMarriage,
        marriagePeriod: updateUserDetailsDto.marriagePeriod,
        separationPeriod: updateUserDetailsDto.separationPeriod,
        kids: updateUserDetailsDto.kids,
        kidsOwnership: updateUserDetailsDto.kidsOwnership,
      });

      await this.personalDetailsRepository.save(personalDetails);
    }

    // Update Family Details
    if (
      updateUserDetailsDto.fatherAlive !== undefined ||
      updateUserDetailsDto.motherAlive !== undefined
    ) {
      let familyDetails = await this.familyDetailsRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!familyDetails) {
        familyDetails = this.familyDetailsRepository.create({
          user,
        });
      }

      Object.assign(familyDetails, {
        fatherAlive: updateUserDetailsDto.fatherAlive,
        fathersOccupation: updateUserDetailsDto.fathersOccupation,
        motherAlive: updateUserDetailsDto.motherAlive,
        siblings: updateUserDetailsDto.siblings,
        marriedBrothers: updateUserDetailsDto.marriedBrothers,
        marriedSisters: updateUserDetailsDto.marriedSisters,
        unmarriedBrothers: updateUserDetailsDto.unmarriedBrothers,
        unmarriedSisters: updateUserDetailsDto.unmarriedSisters,
      });

      await this.familyDetailsRepository.save(familyDetails);
    }

    // Update Location Housing
    if (updateUserDetailsDto.cityId || updateUserDetailsDto.address) {
      let locationHousing = await this.locationHousingRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!locationHousing) {
        locationHousing = this.locationHousingRepository.create({
          user,
        });
      }

      if (updateUserDetailsDto.cityId) {
        const city = await this.cityRepository.findOne({
          where: { id: updateUserDetailsDto.cityId },
        });
        if (city) {
          locationHousing.city = city;
        }
      }

      Object.assign(locationHousing, {
        address: updateUserDetailsDto.address,
        area: updateUserDetailsDto.area,
        houseIn: updateUserDetailsDto.houseIn,
        houseArea: updateUserDetailsDto.houseArea,
        possession: updateUserDetailsDto.possession,
      });

      await this.locationHousingRepository.save(locationHousing);
    }

    // Update Education Career
    if (
      updateUserDetailsDto.qualification ||
      updateUserDetailsDto.occupation
    ) {
      let educationCareer = await this.educationCareerRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!educationCareer) {
        educationCareer = this.educationCareerRepository.create({
          user,
        });
      }

      Object.assign(educationCareer, {
        qualification: updateUserDetailsDto.qualification,
        occupation: updateUserDetailsDto.occupation,
        monthlyIncome: updateUserDetailsDto.monthlyIncome,
        profession: updateUserDetailsDto.profession,
      });

      await this.educationCareerRepository.save(educationCareer);
    }

    // Update Preferences
    if (updateUserDetailsDto.ageLimit || updateUserDetailsDto.heightDemand) {
      let preferences = await this.preferencesRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!preferences) {
        preferences = this.preferencesRepository.create({
          user,
        });
      }

      Object.assign(preferences, {
        ageLimit: updateUserDetailsDto.ageLimit,
        heightDemand: updateUserDetailsDto.heightDemand,
        casteDemand: updateUserDetailsDto.casteDemand,
        cityDemand: updateUserDetailsDto.cityDemand,
        housingDemandIn: updateUserDetailsDto.housingDemandIn,
        housingDemandArea: updateUserDetailsDto.housingDemandArea,
        housingDemandLocation: updateUserDetailsDto.housingDemandLocation,
        housingDemandPossession: updateUserDetailsDto.housingDemandPossession,
        professionDemand: updateUserDetailsDto.professionDemand,
        additionalDemand: updateUserDetailsDto.additionalDemand,
      });

      await this.preferencesRepository.save(preferences);
    }

    return true;
  }

  async calculateProfileCompletion(userId: string): Promise<number> {
    const user = await this.getById(userId);

    let totalFields = 0;
    let filledFields = 0;

    // Count user basic fields
    const userFields = [
      'name',
      'phone',
      'email',
      'gender',
      'profileFor',
    ];
    totalFields += userFields.length;
    filledFields += userFields.filter((field) => user[field]).length;

    // Check related entities
    if (user.personalDetails) {
      totalFields += 6;
      filledFields += Object.values(user.personalDetails).filter(
        (v) => v !== null && v !== undefined,
      ).length;
    }

    if (user.familyDetails) {
      totalFields += 8;
      filledFields += Object.values(user.familyDetails).filter(
        (v) => v !== null && v !== undefined,
      ).length;
    }

    if (user.locationHousing) {
      totalFields += 5;
      filledFields += Object.values(user.locationHousing).filter(
        (v) => v !== null && v !== undefined,
      ).length;
    }

    if (user.educationCareer) {
      totalFields += 4;
      filledFields += Object.values(user.educationCareer).filter(
        (v) => v !== null && v !== undefined,
      ).length;
    }

    if (user.preferences) {
      totalFields += 10;
      filledFields += Object.values(user.preferences).filter(
        (v) => v !== null && v !== undefined,
      ).length;
    }

    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  }
}

