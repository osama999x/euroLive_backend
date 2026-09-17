import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import { AccountStatus, AccountType, Environment } from '../../common/enums';
import { generateNumericOtp, hashPassword, hashToken } from '../../common/utils';
import { RefreshToken, Reseller, StaffUser } from '../../database/entities';
import { MailService } from '../../infrastructure/mail/mail.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { ResellersService } from '../resellers/resellers.service';

const OTP_TTL_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

interface StoredOtp {
  otpHash: string;
  accountId: string;
  attempts: number;
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(StaffUser)
    private readonly staffUsers: Repository<StaffUser>,
    @InjectRepository(Reseller)
    private readonly resellerUsers: Repository<Reseller>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly resellers: ResellersService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async forgotPassword(accountType: AccountType, login: string) {
    const account = await this.findAccount(accountType, login);
    if (!account) {
      return { sent: true, expiresInSeconds: OTP_TTL_SECONDS };
    }

    const cooldownKey = this.cooldownKey(accountType, account.email);
    const reserved = await this.redis.getClient().set(
      cooldownKey,
      '1',
      'EX',
      RESEND_COOLDOWN_SECONDS,
      'NX',
    );
    if (reserved !== 'OK') {
      return { sent: true, expiresInSeconds: OTP_TTL_SECONDS };
    }

    const otp = generateNumericOtp(6);
    const payload: StoredOtp = {
      otpHash: this.hashOtp(otp, account.email, accountType),
      accountId: account.id,
      attempts: 0,
    };
    await this.redis.setJson(this.otpKey(accountType, account.email), payload, OTP_TTL_SECONDS);

    const portal = accountType === AccountType.STAFF ? 'Admin' : 'Reseller';
    try {
      await this.mail.send({
        to: account.email,
        subject: `King Live ${portal} portal password reset code`,
        text: `Your King Live ${portal} portal password reset code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
        html: `
        <p>Your King Live <strong>${portal}</strong> portal password reset code is:</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:700">${otp}</p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
      });
    } catch {
      await this.redis.del(this.otpKey(accountType, account.email));
      await this.redis.del(this.cooldownKey(accountType, account.email));
      throw new AppException(
        'Could not send reset email. Try again in a minute.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const env = this.config.get<string>('app.env');
    if (env !== Environment.Production) {
      this.logger.log(`Password OTP for ${account.email} (${portal}): ${otp}`);
    }

    return { sent: true, expiresInSeconds: OTP_TTL_SECONDS };
  }

  async verifyOtp(accountType: AccountType, login: string, otp: string) {
    await this.assertValidOtp(accountType, login, otp, false);
    return { valid: true };
  }

  async resetPassword(
    accountType: AccountType,
    login: string,
    otp: string,
    newPassword: string,
  ) {
    const stored = await this.assertValidOtp(accountType, login, otp, true);
    const passwordHash = await hashPassword(newPassword);

    if (accountType === AccountType.STAFF) {
      await this.staffUsers.update(stored.accountId, { passwordHash });
    } else {
      await this.resellerUsers.update(stored.accountId, { passwordHash });
    }

    await this.revokeRefreshTokens(stored.accountId);
    return { reset: true };
  }

  private async assertValidOtp(
    accountType: AccountType,
    login: string,
    otp: string,
    consumeOnSuccess: boolean,
  ): Promise<StoredOtp> {
    const account = await this.findAccount(accountType, login);
    if (!account) {
      throw new AppException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }

    const key = this.otpKey(accountType, account.email);
    const stored = await this.redis.getJson<StoredOtp>(key);
    if (!stored || stored.accountId !== account.id) {
      throw new AppException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }

    if (stored.attempts >= MAX_ATTEMPTS) {
      await this.redis.del(key);
      throw new AppException('Too many invalid attempts. Request a new OTP.', HttpStatus.BAD_REQUEST);
    }

    const incoming = this.hashOtp(otp, account.email, accountType);
    if (incoming !== stored.otpHash) {
      stored.attempts += 1;
      const ttl = await this.redis.getClient().ttl(key);
      await this.redis.setJson(key, stored, ttl > 0 ? ttl : OTP_TTL_SECONDS);
      throw new AppException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }

    if (consumeOnSuccess) {
      await this.redis.del(key);
    }

    return stored;
  }

  private async findAccount(accountType: AccountType, login: string) {
    const trimmed = login.trim();
    if (accountType === AccountType.STAFF) {
      const staff = await this.staffUsers
        .createQueryBuilder('staff')
        .where('LOWER(staff.email) = LOWER(:login) OR staff.username = :login', {
          login: trimmed,
        })
        .getOne();
      if (!staff || staff.status !== AccountStatus.ACTIVE) {
        return null;
      }
      return staff;
    }

    const reseller = await this.resellers.findByLogin(trimmed);
    if (!reseller || reseller.status !== AccountStatus.ACTIVE) {
      return null;
    }
    return reseller;
  }

  private async revokeRefreshTokens(accountId: string): Promise<void> {
    await this.refreshTokens.update(
      { accountId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private hashOtp(otp: string, email: string, accountType: AccountType): string {
    return hashToken(`${accountType}:${email.toLowerCase()}:${otp}`);
  }

  private otpKey(accountType: AccountType, email: string): string {
    return `pwd-otp:${accountType}:${email.toLowerCase()}`;
  }

  private cooldownKey(accountType: AccountType, email: string): string {
    return `pwd-otp-cd:${accountType}:${email.toLowerCase()}`;
  }
}
