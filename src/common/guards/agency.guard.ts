import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountType, AgencyStatus } from '../enums';
import { AuthenticatedRequest } from '../interfaces';
import { Agency } from '../../database/entities';

@Injectable()
export class AgencyGuard implements CanActivate {
  constructor(
    @InjectRepository(Agency)
    private readonly agencies: Repository<Agency>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.accountType !== AccountType.AGENCY) {
      throw new ForbiddenException('Agency account required');
    }

    const agency = await this.agencies.findOne({
      where: { id: request.user.sub },
    });
    if (!agency) {
      throw new ForbiddenException('Agency not found');
    }
    if (agency.status !== AgencyStatus.ACTIVE || agency.frozen) {
      throw new ForbiddenException('Agency account is not active');
    }

    request.agency = agency;
    return true;
  }
}
