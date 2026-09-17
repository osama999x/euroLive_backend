import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenType } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(
      { ...payload, typ: TokenType.ACCESS },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn') || '15m',
      },
    );
  }

  signRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(
      { ...payload, typ: TokenType.REFRESH },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') || '7d',
      },
    );
  }

  signChallengeToken(payload: JwtPayload): string {
    return this.jwtService.sign(
      { ...payload, typ: TokenType.TWO_FA_CHALLENGE },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: '5m',
      },
    );
  }

  verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get<string>('jwt.secret'),
    });
  }

  verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
    });
  }
}
