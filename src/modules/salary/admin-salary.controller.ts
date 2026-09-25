import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser, RequestMeta, RequestMetaDto, Roles } from '../../common/decorators';
import { AccountType, StaffRole } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto';
import { JwtPayload } from '../../common/interfaces';
import { SalaryService } from './salary.service';
import {
  CalculatePayoutDto,
  CorrectPayoutDto,
  CreatePeriodDto,
  CreateSalaryRuleDto,
  RecordHoursDto,
  UpdateCountryDto,
} from '../euro/dto/core.dto';

@ApiTags('Admin Salary')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin')
export class AdminSalaryController {
  constructor(private readonly salary: SalaryService) {}

  @Get('countries')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
  countries() {
    return this.salary.listCountries();
  }

  @Patch('countries/:code')
  @Roles(StaffRole.SUPER_ADMIN)
  updateCountry(
    @Param('code') code: string,
    @Body() dto: UpdateCountryDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.salary.updateCountry(code.toUpperCase(), dto, actor, meta);
  }

  @Get('salary-rules')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
  rules(@Query('countryCode') countryCode?: string) {
    return this.salary.listRules(countryCode);
  }

  @Post('salary-rules')
  @Roles(StaffRole.SUPER_ADMIN)
  createRule(
    @Body() dto: CreateSalaryRuleDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.salary.createRule(dto, actor, meta);
  }

  @Patch('salary-rules/:id')
  @Roles(StaffRole.SUPER_ADMIN)
  updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateSalaryRuleDto>,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.salary.updateRule(id, dto, actor, meta);
  }

  @Post('salary/periods')
  @Roles(StaffRole.SUPER_ADMIN)
  period(@Body() dto: CreatePeriodDto, @CurrentUser() actor: JwtPayload) {
    return this.salary.createPeriod(dto, actor);
  }

  @Get('salary/periods')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
  periods() {
    return this.salary.listPeriods();
  }

  @Post('hosts/:id/hours')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  hours(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordHoursDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.salary.recordHours(id, dto, actor, meta);
  }

  @Post('payouts/calculate')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Calculate country salary + agency share for a period' })
  calculate(
    @Body() dto: CalculatePayoutDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.salary.calculate(dto.periodId, actor, meta);
  }

  @Get('payouts')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
  list(@Query() query: PaginationQueryDto) {
    return this.salary.listBatches(query);
  }

  @Get('payouts/:id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.salary.getBatch(id);
  }

  @Post('payouts/:id/approve-hold')
  @Roles(StaffRole.SUPER_ADMIN)
  hold(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.salary.approveHold(id, actor, meta);
  }

  @Post('payouts/:id/items/:itemId/correct')
  @Roles(StaffRole.SUPER_ADMIN)
  correct(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: CorrectPayoutDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.salary.correctItem(id, itemId, dto.newAmount, dto.reason, actor, meta);
  }

  @Post('payouts/:id/release')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Final release after 3-day hold' })
  release(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.salary.release(id, actor, meta);
  }
}
