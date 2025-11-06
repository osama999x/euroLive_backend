import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtCustomService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  async create(data: object, expiresIn?: string): Promise<string> {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT secret key not found in environment variables');
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv === 'development') {
      expiresIn = this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN');
    }

    const expiredIn = expiresIn || '3600';

    return this.jwtService.sign(data, {
      secret: jwtSecret,
      expiresIn: Number(expiredIn),
    });
  }

  async authenticate(token: string): Promise<any> {
    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        throw new Error('JWT secret key not found in environment variables');
      }

      return this.jwtService.verify(token, { secret: jwtSecret });
    } catch (error) {
      console.log('JWT authentication error: ', error);
      throw error;
    }
  }

  async signRefreshToken(data: object, expiresIn?: string): Promise<string> {
    const refreshKey = this.configService.get<string>('REFRESH_KEY');
    if (!refreshKey) {
      throw new Error('JWT refresh key not found in environment variables');
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv === 'development') {
      expiresIn = this.configService.get<string>('REFRESH_KEY_EXPIRES_IN');
    }

    const refreshTokenExpiresIn = expiresIn || '36000';

    return this.jwtService.sign(data, {
      secret: refreshKey,
      expiresIn: Number(refreshTokenExpiresIn),
    });
  }
}

