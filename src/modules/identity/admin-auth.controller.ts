import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AccountTypes,
  CurrentUser,
  Public,
} from '../../common/decorators';
import { AccountType } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { LoginDto } from './dto/login.dto';
import { TotpCodeDto } from './dto/totp-code.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwords: PasswordResetService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Staff portal login (2FA challenge if enabled)' })
  login(@Body() dto: LoginDto) {
    return this.auth.loginStaff(dto.login, dto.password);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Send a 6-digit password reset OTP to the staff email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwords.forgotPassword(AccountType.STAFF, dto.login);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-otp')
  @ApiOperation({ summary: 'Check the password-reset OTP before asking for a new password' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.passwords.verifyOtp(AccountType.STAFF, dto.login, dto.otp);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new staff password using the email OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwords.resetPassword(
      AccountType.STAFF,
      dto.login,
      dto.otp,
      dto.newPassword,
    );
  }

  @Public()
  @Post('2fa/verify')
  @ApiOperation({ summary: 'Complete staff login with authenticator code' })
  verify2fa(@Body() dto: Verify2faDto) {
    return this.auth.verifyStaff2fa(dto.challengeToken, dto.code);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.STAFF)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.getStaffMe(user.sub);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.STAFF)
  @Post('2fa/setup')
  setup2fa(@CurrentUser() user: JwtPayload) {
    return this.auth.setup2fa(user.sub);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.STAFF)
  @Post('2fa/enable')
  enable2fa(@CurrentUser() user: JwtPayload, @Body() dto: TotpCodeDto) {
    return this.auth.enable2fa(user.sub, dto.code);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.STAFF)
  @Post('2fa/disable')
  disable2fa(@CurrentUser() user: JwtPayload, @Body() dto: TotpCodeDto) {
    return this.auth.disable2fa(user.sub, dto.code);
  }
}
