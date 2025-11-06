import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './providers/users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { SendOtpDto } from './dtos/send-otp.dto';
import { VerifyOtpDto } from './dtos/verify-otp.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { UpdateUserDetailsDto } from './dtos/update-user-details.dto';
import { Public, CurrentUser } from '../common/decorators';
import { ResponseCodes } from '../common/utils';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAll() {
    const users = await this.usersService.getAll();
    return {
      message: users.length ? 'Users fetched successfully' : 'No users found',
      data: users,
      status: ResponseCodes.OK,
    };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const user = await this.usersService.getById(id);
    return {
      message: 'User fetched successfully',
      data: user,
      status: ResponseCodes.OK,
    };
  }

  @Put()
  async update(@Body() updateUserDto: UpdateUserDto & { id: string }) {
    if (!updateUserDto.id) {
      throw new BadRequestException('User ID is required');
    }

    await this.usersService.update(updateUserDto.id, updateUserDto);
    return {
      message: 'User updated successfully',
      status: ResponseCodes.OK,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.usersService.delete(id);
    return {
      message: 'User deleted successfully',
      status: ResponseCodes.OK,
    };
  }

  @Post('send-otp')
  @Public()
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    const sent = await this.usersService.sendOtp(
      sendOtpDto.phone,
      sendOtpDto.email,
      'Forgot Password',
    );

    return {
      message: sent ? 'OTP sent successfully' : 'Failed to send OTP',
      data: sent,
      status: sent ? ResponseCodes.OK : ResponseCodes.BAD,
    };
  }

  @Post('verify-otp')
  @Public()
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const isVerified = await this.usersService.verifyOtp(
      verifyOtpDto.phone,
      verifyOtpDto.otp,
      verifyOtpDto.email,
    );

    return {
      message: isVerified ? 'OTP verified successfully' : 'Invalid OTP',
      status: isVerified ? ResponseCodes.OK : ResponseCodes.BAD,
    };
  }

  @Post('reset-password')
  @Public()
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    if (resetPasswordDto.password !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const updatedUser = await this.usersService.resetPassword(
      resetPasswordDto.phone,
      resetPasswordDto.password,
    );

    return {
      message: 'Password reset successfully',
      data: updatedUser,
      status: ResponseCodes.OK,
    };
  }

  @Post('update-by-email')
  @Public()
  async updateByEmail(
    @Body() body: { email: string; password: string; confirmPassword: string },
  ) {
    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    await this.usersService.updateByEmail(body.email, body.password);

    return {
      message: 'User updated successfully',
      status: ResponseCodes.OK,
    };
  }

  @Post('logout/:id')
  async logOut(@Param('id') id: string) {
    const isLoggedOut = await this.usersService.logOut(id);

    return {
      message: isLoggedOut ? 'Logout successful' : 'Logout failed',
      status: isLoggedOut ? ResponseCodes.OK : ResponseCodes.BAD,
    };
  }

  @Post('update-details')
  async addOrUpdateUserDetails(
    @Body() updateUserDetailsDto: UpdateUserDetailsDto,
  ) {
    const response = await this.usersService.addOrUpdateUserDetails(
      updateUserDetailsDto.userId,
      updateUserDetailsDto,
    );

    return {
      message: response
        ? 'User details updated successfully'
        : 'User details update failed',
      status: ResponseCodes.OK,
    };
  }

  @Get(':id/profile-completion')
  async profileCompletionPercentage(@Param('id') id: string) {
    const profileCompletion =
      await this.usersService.calculateProfileCompletion(id);

    return {
      message: 'Fetched Successfully',
      data: { profileCompletion },
      status: ResponseCodes.OK,
    };
  }
}

