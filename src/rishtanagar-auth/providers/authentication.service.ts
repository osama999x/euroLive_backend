import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../../rishtanagar-users/providers/users.service';
import { JwtCustomService } from '../../common/providers/jwt.service';
import { PasswordHashUtil } from '../../common/utils';
import { LoginDto } from '../dtos/login.dto';
import { CreateUserDto } from '../../rishtanagar-users/dtos/create-user.dto';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AuthenticationService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtCustomService,
    private readonly configService: ConfigService,
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(googleClientId);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.getByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException(
        'User is not registered. Please sign up first.',
      );
    }

    const accountActiveCheck = await this.usersService.accountActiveCheck(
      loginDto.email,
    );
    if (accountActiveCheck) {
      throw new UnauthorizedException(
        'Your account is inactive. Please contact support.',
      );
    }

    const isValidPassword = await PasswordHashUtil.validatePassword(
      loginDto.password,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid password. Please try again.');
    }

    await this.usersService.updateTokenAndReferral(user.id, loginDto.fcmToken);

    const accessToken = await this.jwtService.create({ userId: user.id });
    const refreshToken = await this.jwtService.signRefreshToken({
      userId: user.id,
    });

    const userData = JSON.parse(JSON.stringify(user));
    delete userData.password;
    delete userData.updatedDate;

    return {
      ...userData,
      accessToken,
      refreshToken,
    };
  }

  async create(createUserDto: CreateUserDto) {
    const duplicatePhone = await this.usersService.duplicateCheck(
      createUserDto.phone,
    );

    if (duplicatePhone) {
      throw new BadRequestException(
        'This phone number is already registered. Try logging in.',
      );
    }

    const duplicateEmail = await this.usersService.checkEmail(
      createUserDto.email,
    );

    if (duplicateEmail) {
      throw new BadRequestException(
        'This email is already in use. Please use a different email.',
      );
    }

    const user = await this.usersService.create(createUserDto);

    if (user) {
      return user;
    } else {
      throw new BadRequestException(
        'An error occurred while processing your request. Please try again.',
      );
    }
  }

  async logOut(id: string) {
    const removeUserFcmKey = await this.usersService.logOut(id);

    if (removeUserFcmKey) {
      return true;
    } else {
      throw new BadRequestException('Logout failed. Please try again later.');
    }
  }

  async googleSignup(token: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: token,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Invalid Google token.');
    }

    const { email, name, picture } = payload;

    if (!email) {
      throw new BadRequestException('Email is required.');
    }

    const existingUser = await this.usersService.getByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User already exists. Please log in.');
    }

    // Download profile image if available
    let base64Image = null;
    if (picture) {
      base64Image = await this.downloadImageAsBase64(picture);
    }

    // In a real application, you would need to provide required fields
    // For now, this is a simplified version
    throw new BadRequestException(
      'Google signup requires additional information (religion, gender, phone, etc.)',
    );
  }

  async googleLogin(token: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: token,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Invalid Google token.');
    }

    const { email } = payload;

    if (!email) {
      throw new BadRequestException('Email is required.');
    }

    const user = await this.usersService.getByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found. Please sign up first.');
    }

    // Generate tokens
    const accessToken = await this.jwtService.create({ userId: user.id });
    const refreshToken = await this.jwtService.signRefreshToken({
      userId: user.id,
    });

    const userData = JSON.parse(JSON.stringify(user));
    delete userData.password;
    delete userData.updatedDate;

    return {
      ...userData,
      accessToken,
      refreshToken,
    };
  }

  private async downloadImageAsBase64(imageUrl: string): Promise<string | null> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const contentType = response.headers['content-type'];
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }
}

