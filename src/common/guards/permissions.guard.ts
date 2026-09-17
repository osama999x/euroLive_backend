import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../constants';
import { AccountType, ResellerPermissionFlag } from '../enums';
import { AuthenticatedRequest } from '../interfaces';
import { ResellerPermissions } from '../../database/entities';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<ResellerPermissionFlag[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (user?.accountType !== AccountType.RESELLER) {
      throw new ForbiddenException('Reseller permissions required');
    }

    const perms = await this.dataSource.getRepository(ResellerPermissions).findOne({
      where: { resellerId: user.sub },
    });

    if (!perms) {
      throw new ForbiddenException('Reseller permissions are not configured');
    }

    const flags: Record<ResellerPermissionFlag, boolean> = {
      [ResellerPermissionFlag.RECHARGE]: perms.canRecharge,
      [ResellerPermissionFlag.FRAME]: perms.canAssignFrame,
      [ResellerPermissionFlag.ENTRY]: perms.canAssignEntry,
      [ResellerPermissionFlag.BADGE]: perms.canAssignBadge,
      [ResellerPermissionFlag.REMOVE]: perms.canRemove,
      [ResellerPermissionFlag.EXPIRY]: perms.canSetExpiry,
    };

    const missing = required.filter((flag) => !flags[flag]);
    if (missing.length) {
      throw new ForbiddenException(`Missing permission: ${missing.join(', ')}`);
    }

    return true;
  }
}
