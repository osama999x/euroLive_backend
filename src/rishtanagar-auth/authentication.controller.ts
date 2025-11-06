import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthenticationService } from './providers/authentication.service';
import { LoginDto } from './dtos/login.dto';
import { GoogleAuthDto } from './dtos/google-auth.dto';
import { CreateUserDto } from '../rishtanagar-users/dtos/create-user.dto';
import { Public } from '../common/decorators';
import { ResponseCodes } from '../common/utils';

@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const userData = await this.authenticationService.login(loginDto);
    return {
      message: 'Login successful! Welcome back.',
      data: userData,
      status: ResponseCodes.OK,
    };
  }

  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.authenticationService.create(createUserDto);
    return {
      message: 'OTP has been sent to your registered phone number.',
      data: user,
      status: ResponseCodes.OK,
    };
  }

  @Post('logout/:id')
  @HttpCode(HttpStatus.OK)
  async logOut(@Param('id') id: string) {
    await this.authenticationService.logOut(id);
    return {
      message: 'You have successfully logged out.',
      status: ResponseCodes.OK,
    };
  }

  @Post('google-signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async googleSignup(@Body() googleAuthDto: GoogleAuthDto) {
    const user = await this.authenticationService.googleSignup(
      googleAuthDto.token,
    );
    return {
      message: 'Google signup successful! Welcome.',
      data: user,
      status: ResponseCodes.CREATED,
    };
  }

  @Post('google-login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() googleAuthDto: GoogleAuthDto) {
    const userData = await this.authenticationService.googleLogin(
      googleAuthDto.token,
    );
    return {
      message: 'Google login successful! Welcome back.',
      data: userData,
      status: ResponseCodes.OK,
    };
  }
}

