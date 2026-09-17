import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AccountTypes, CurrentUser, Public } from '../../common/decorators';
import { AccountType } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { ResellersService } from '../resellers/resellers.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Reseller Auth')
@Controller('reseller/auth')
export class ResellerAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwords: PasswordResetService,
    private readonly resellers: ResellersService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Reseller portal login' })
  login(@Body() dto: LoginDto) {
    return this.auth.loginReseller(dto.login, dto.password);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Send a 6-digit password reset OTP to the reseller email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwords.forgotPassword(AccountType.RESELLER, dto.login);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-otp')
  @ApiOperation({ summary: 'Check the password-reset OTP before asking for a new password' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.passwords.verifyOtp(AccountType.RESELLER, dto.login, dto.otp);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new reseller password using the email OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwords.resetPassword(
      AccountType.RESELLER,
      dto.login,
      dto.otp,
      dto.newPassword,
    );
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.RESELLER)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.resellers.findById(user.sub).then((row) => this.resellers.toPublic(row));
  }
}
