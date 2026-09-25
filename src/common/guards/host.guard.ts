import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountType, HostStatus } from '../enums';
import { AuthenticatedRequest } from '../interfaces';
import { HostProfile } from '../../database/entities';

@Injectable()
export class HostGuard implements CanActivate {
  constructor(
    @InjectRepository(HostProfile)
    private readonly hosts: Repository<HostProfile>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.accountType !== AccountType.USER) {
      throw new ForbiddenException('Host account required');
    }

    const profile = await this.hosts.findOne({
      where: { userId: request.user.sub },
      relations: ['user', 'agency'],
    });
    if (!profile) {
      throw new ForbiddenException('Host profile required');
    }
    if (profile.status === HostStatus.FROZEN) {
      throw new ForbiddenException('Host account is frozen');
    }

    request.hostProfile = profile;
    return true;
  }
}
