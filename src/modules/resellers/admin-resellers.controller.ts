import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccountTypes,
  CurrentUser,
  RequestMeta,
  RequestMetaDto,
  Roles,
} from '../../common/decorators';
import { AccountType, StaffRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { ResellersService } from './resellers.service';
import {
  AdjustBalanceDto,
  CreateResellerDto,
  ResellerPermissionsDto,
  UpdateCreditLimitDto,
  UpdateResellerDto,
} from './dto/reseller.dto';
import { ResellersListQueryDto } from './dto/list-query.dto';

@ApiTags('Admin Resellers')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/resellers')
export class AdminResellersController {
  constructor(private readonly resellers: ResellersService) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Create a reseller with permissions and optional opening balance' })
  create(
    @Body() dto: CreateResellerDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.resellers.create(dto, actor, meta).then((row) => this.resellers.toPublic(row));
  }

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
  @ApiOperation({ summary: 'List resellers' })
  list(@Query() query: ResellersListQueryDto) {
    return this.resellers.list(query);
  }

  @Get(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
  @ApiOperation({ summary: 'Reseller detail' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.resellers.findById(id).then((row) => this.resellers.toPublic(row));
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Update reseller profile / Official flag' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResellerDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.resellers.updateProfile(id, dto, actor, meta);
  }

  @Patch(':id/balance')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
  @ApiOperation({ summary: 'Credit or debit reseller coin balance' })
  adjustBalance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustBalanceDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.resellers.adjustBalance(
      id,
      dto.direction,
      dto.amount,
      actor,
      dto.note,
      dto.idempotencyKey,
      meta,
    );
  }

  @Patch(':id/permissions')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Update reseller permission flags' })
  permissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResellerPermissionsDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.resellers.updatePermissions(id, dto, actor, meta);
  }

  @Patch(':id/limits')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Update daily recharge / item limits' })
  limits(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResellerPermissionsDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.resellers.updateLimits(
      id,
      {
        dailyRechargeLimit: dto.dailyRechargeLimit,
        dailyFrameLimit: dto.dailyFrameLimit,
        dailyEntryLimit: dto.dailyEntryLimit,
        dailyBadgeLimit: dto.dailyBadgeLimit,
      },
      actor,
      meta,
    );
  }

  @Patch(':id/credit-limit')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
  @ApiOperation({ summary: 'Update reseller credit limit' })
  creditLimit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreditLimitDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.resellers.updateCreditLimit(id, dto.creditLimit, actor, meta);
  }
}
