import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCOUNT_TYPES_KEY, IS_PUBLIC_KEY } from '../constants';
import { AccountType } from '../enums';
import { AuthenticatedRequest } from '../interfaces';

@Injectable()
export class AccountTypeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<AccountType[]>(
      ACCOUNT_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    if (!required.includes(user.accountType as AccountType)) {
      throw new ForbiddenException('This account cannot access this resource');
    }

    return true;
  }
}
