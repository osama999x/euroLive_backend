import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser } from '../../common/decorators';
import { AccountType } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto';
import { JwtPayload } from '../../common/interfaces';
import { AgencyGuard } from '../../common/guards';
import { HostsService } from '../hosts/hosts.service';
import { SalaryService } from '../salary/salary.service';
import { AgenciesService } from './agencies.service';

@ApiTags('Agency Portal')
@ApiBearerAuth()
@AccountTypes(AccountType.AGENCY)
@UseGuards(AgencyGuard)
@Controller('agency')
export class AgencyPortalController {
  constructor(
    private readonly agencies: AgenciesService,
    private readonly hosts: HostsService,
    private readonly salary: SalaryService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Agency share totals only (no host salary detail)' })
  async dashboard(@CurrentUser() user: JwtPayload) {
    const agency = await this.agencies.findById(user.sub);
    const shares = await this.salary.agencyShares(user.sub);
    const roster = await this.hosts.list({ agencyId: user.sub, page: 1, limit: 50 });
    return {
      agency: this.agencies.toPublic(agency),
      hostCount: roster.meta.total,
      shareTotal: shares.shareTotal,
      wallet: shares.wallet,
    };
  }

  @Get('hosts')
  @ApiOperation({ summary: 'Agency host roster without salary detail' })
  hostsList(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
    return this.hosts.list({ ...query, agencyId: user.sub });
  }

  @Get('shares')
  shares(@CurrentUser() user: JwtPayload) {
    return this.salary.agencyShares(user.sub);
  }
}
