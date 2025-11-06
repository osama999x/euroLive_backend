import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtCustomService } from '../providers/jwt.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtCustomService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const url = request.url;

    // Skip authentication for certain routes
    const skipAuthRoutes = [
      '/files',
      '/videos',
      '/images',
      '/logs',
      'refreshToken',
      'login',
      '/api/v1/test',
    ];

    if (skipAuthRoutes.some((route) => url.includes(route))) {
      return true;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('You are not logged in');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('You are not logged in');
    }

    try {
      const payload = await this.jwtService.authenticate(token);

      if (!payload) {
        throw new UnauthorizedException('Invalid Token!');
      }

      // Check if user exists
      const currentUser = await this.userRepository.findOne({
        where: { id: payload.userId },
      });

      if (!currentUser) {
        throw new UnauthorizedException(
          'User belonging to this token does not exist',
        );
      }

      // Attach user to request
      request.user = currentUser;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

