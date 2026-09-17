import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppException } from '../../common/exceptions';
import {
  AccountStatus,
  AccountType,
  StaffRole,
  TokenType,
} from '../../common/enums';
import {
  comparePassword,
  generateTotpSecret,
  hashToken,
  totpKeyUri,
  verifyTotp,
} from '../../common/utils';
import { JwtPayload } from '../../common/interfaces';
import { RefreshToken, Reseller, StaffUser } from '../../database/entities';
import { TokenService } from '../../infrastructure/jwt/token.service';
import { ResellersService } from '../resellers/resellers.service';
import { toStaffPublic } from './staff.mapper';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(StaffUser)
    private readonly staffUsers: Repository<StaffUser>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly tokens: TokenService,
    private readonly resellers: ResellersService,
  ) {}

  async loginStaff(login: string, password: string) {
    const staff = await this.staffUsers
      .createQueryBuilder('staff')
      .addSelect(['staff.passwordHash', 'staff.totpSecret'])
      .leftJoinAndSelect('staff.roles', 'roles')
      .where('LOWER(staff.email) = LOWER(:login) OR staff.username = :login', { login })
      .getOne();

    if (!staff || !(await comparePassword(password, staff.passwordHash))) {
      throw new AppException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    if (staff.status !== AccountStatus.ACTIVE) {
      throw new AppException('Account is disabled', HttpStatus.FORBIDDEN);
    }

    if (staff.totpEnabled) {
      return {
        requires2fa: true,
        challengeToken: this.tokens.signChallengeToken({
          sub: staff.id,
          accountType: AccountType.STAFF,
          email: staff.email,
          username: staff.username,
        }),
      };
    }

    return {
      requires2fa: false,
      staff: toStaffPublic(staff),
      ...(await this.issuePair(this.staffPayload(staff))),
    };
  }

  async verifyStaff2fa(challengeToken: string, code: string) {
    let payload: JwtPayload;
    try {
      payload = await this.tokens.verifyAccessToken(challengeToken);
    } catch {
      throw new AppException('Invalid or expired 2FA challenge', HttpStatus.UNAUTHORIZED);
    }
    if (payload.typ !== TokenType.TWO_FA_CHALLENGE || payload.accountType !== AccountType.STAFF) {
      throw new AppException('Invalid 2FA challenge', HttpStatus.UNAUTHORIZED);
    }

    const staff = await this.staffUsers
      .createQueryBuilder('staff')
      .addSelect(['staff.totpSecret'])
      .leftJoinAndSelect('staff.roles', 'roles')
      .where('staff.id = :id', { id: payload.sub })
      .getOne();

    if (!staff?.totpEnabled || !staff.totpSecret) {
      throw new AppException('2FA is not enabled', HttpStatus.BAD_REQUEST);
    }
    if (!verifyTotp(code, staff.totpSecret)) {
      throw new AppException('Invalid authenticator code', HttpStatus.UNAUTHORIZED);
    }

    return {
      requires2fa: false,
      staff: toStaffPublic(staff),
      ...(await this.issuePair(this.staffPayload(staff))),
    };
  }

  async setup2fa(staffId: string) {
    const staff = await this.staffUsers.findOneByOrFail({ id: staffId });
    const secret = generateTotpSecret();
    await this.staffUsers.update(staffId, { totpSecret: secret, totpEnabled: false });
    return {
      secret,
      otpauthUrl: totpKeyUri(staff.email, secret),
    };
  }

  async enable2fa(staffId: string, code: string) {
    const staff = await this.staffUsers
      .createQueryBuilder('staff')
      .addSelect(['staff.totpSecret'])
      .where('staff.id = :id', { id: staffId })
      .getOne();

    if (!staff?.totpSecret) {
      throw new AppException('Call 2FA setup first', HttpStatus.BAD_REQUEST);
    }
    if (!verifyTotp(code, staff.totpSecret)) {
      throw new AppException('Invalid authenticator code', HttpStatus.UNAUTHORIZED);
    }

    staff.totpEnabled = true;
    await this.staffUsers.save(staff);
    return { totpEnabled: true };
  }

  async disable2fa(staffId: string, code: string) {
    const staff = await this.staffUsers
      .createQueryBuilder('staff')
      .addSelect(['staff.totpSecret'])
      .where('staff.id = :id', { id: staffId })
      .getOne();

    if (!staff?.totpEnabled || !staff.totpSecret) {
      throw new AppException('2FA is not enabled', HttpStatus.BAD_REQUEST);
    }
    if (!verifyTotp(code, staff.totpSecret)) {
      throw new AppException('Invalid authenticator code', HttpStatus.UNAUTHORIZED);
    }

    staff.totpEnabled = false;
    staff.totpSecret = null;
    await this.staffUsers.save(staff);
    return { totpEnabled: false };
  }

  async loginReseller(login: string, password: string) {
    const reseller = await this.resellers.findByLogin(login);
    if (!reseller || !(await comparePassword(password, reseller.passwordHash))) {
      throw new AppException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    if (reseller.status !== AccountStatus.ACTIVE) {
      throw new AppException('Account is disabled', HttpStatus.FORBIDDEN);
    }

    const payload = this.resellerPayload(reseller);
    return {
      reseller: this.resellers.toPublic(reseller),
      ...(await this.issuePair(payload)),
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }

    const hash = hashToken(refreshToken);
    const stored = await this.refreshTokens.findOne({
      where: { tokenHash: hash, accountId: payload.sub },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppException('Refresh token is revoked or expired', HttpStatus.UNAUTHORIZED);
    }

    stored.revokedAt = new Date();
    await this.refreshTokens.save(stored);

    const nextPayload: JwtPayload = {
      sub: payload.sub,
      accountType: payload.accountType,
      email: payload.email,
      username: payload.username,
      role: payload.role,
      roles: payload.roles,
      permissions: payload.permissions,
    };

    return this.issuePair(nextPayload);
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = hashToken(refreshToken);
    const stored = await this.refreshTokens.findOne({ where: { tokenHash: hash } });
    if (stored && !stored.revokedAt) {
      stored.revokedAt = new Date();
      await this.refreshTokens.save(stored);
    }
  }

  async getStaffMe(id: string) {
    const staff = await this.staffUsers.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
    if (!staff) {
      throw new AppException('Staff user not found', HttpStatus.NOT_FOUND);
    }
    return toStaffPublic(staff);
  }

  private staffPayload(staff: StaffUser): JwtPayload {
    const roles = staff.roles?.map((role) => role.slug) ?? [];
    return {
      sub: staff.id,
      email: staff.email,
      username: staff.username,
      accountType: AccountType.STAFF,
      roles,
      role: roles.includes(StaffRole.SUPER_ADMIN) ? StaffRole.SUPER_ADMIN : roles[0],
    };
  }

  private resellerPayload(reseller: Reseller): JwtPayload {
    const flags = reseller.permissions;
    const permissions: string[] = [];
    if (flags?.canRecharge) permissions.push('recharge');
    if (flags?.canAssignFrame) permissions.push('frame');
    if (flags?.canAssignEntry) permissions.push('entry');
    if (flags?.canAssignBadge) permissions.push('badge');
    if (flags?.canRemove) permissions.push('remove');
    if (flags?.canSetExpiry) permissions.push('expiry');

    return {
      sub: reseller.id,
      email: reseller.email,
      username: reseller.username,
      accountType: AccountType.RESELLER,
      permissions,
    };
  }

  private async issuePair(payload: JwtPayload): Promise<TokenPair> {
    const jti = randomUUID();
    const refreshToken = this.tokens.signRefreshToken({ ...payload, jti });
    const accessToken = this.tokens.signAccessToken(payload);

    const decoded = await this.tokens.verifyRefreshToken(refreshToken);
    await this.refreshTokens.save(
      this.refreshTokens.create({
        accountType: payload.accountType,
        accountId: payload.sub,
        tokenHash: hashToken(refreshToken),
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 86400000),
      }),
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: '15m',
    };
  }
}
