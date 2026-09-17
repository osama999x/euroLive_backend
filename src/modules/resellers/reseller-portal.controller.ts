import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccountTypes,
  CurrentUser,
  RequestMeta,
  RequestMetaDto,
  RequirePermissions,
} from '../../common/decorators';
import {
  AccountType,
  AssignDuration,
  CatalogItemType,
  ResellerPermissionFlag,
} from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto';
import { JwtPayload } from '../../common/interfaces';
import { ResellersService } from './resellers.service';
import { AssignItemDto, TransferCoinsDto } from './dto/reseller.dto';
import { ReportRangeQueryDto } from './dto/list-query.dto';
import { CatalogListQueryDto } from '../catalog/dto/catalog-list-query.dto';
import { CatalogService } from '../catalog/catalog.service';

@ApiTags('Reseller Portal')
@ApiBearerAuth()
@AccountTypes(AccountType.RESELLER)
@Controller('reseller')
export class ResellerPortalController {
  constructor(
    private readonly resellers: ResellersService,
    private readonly catalog: CatalogService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Reseller balance, credit, and today snapshot' })
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.resellers.dashboard(user.sub);
  }

  @Get('limits')
  @ApiOperation({ summary: 'Read-only daily limits and usage' })
  limits(@CurrentUser() user: JwtPayload) {
    return this.resellers.limitsView(user.sub);
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Catalog items this reseller may assign' })
  catalogList(@Query() query: CatalogListQueryDto) {
    return this.catalog.list({ ...query, resellerAccess: true });
  }

  @Post('coins/transfer')
  @RequirePermissions(ResellerPermissionFlag.RECHARGE)
  @ApiOperation({ summary: 'Transfer coins to a consumer user ID' })
  transfer(
    @CurrentUser() user: JwtPayload,
    @Body() dto: TransferCoinsDto,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.resellers.transferCoins(
      user.sub,
      dto.publicId,
      dto.amount,
      dto.idempotencyKey,
      user,
      meta,
    );
  }

  @Post('frames/assign')
  @RequirePermissions(ResellerPermissionFlag.FRAME)
  assignFrame(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignItemDto,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.resellers.assignItem(
      user.sub,
      CatalogItemType.FRAME,
      { ...dto, duration: dto.duration as AssignDuration },
      user,
      meta,
    );
  }

  @Post('entries/assign')
  @RequirePermissions(ResellerPermissionFlag.ENTRY)
  assignEntry(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignItemDto,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.resellers.assignItem(
      user.sub,
      CatalogItemType.ENTRY,
      { ...dto, duration: dto.duration as AssignDuration },
      user,
      meta,
    );
  }

  @Post('badges/assign')
  @RequirePermissions(ResellerPermissionFlag.BADGE)
  assignBadge(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignItemDto,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.resellers.assignItem(
      user.sub,
      CatalogItemType.BADGE,
      { ...dto, duration: dto.duration as AssignDuration },
      user,
      meta,
    );
  }

  @Delete('items/:id')
  @RequirePermissions(ResellerPermissionFlag.REMOVE)
  removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.resellers.removeItem(user.sub, id, meta);
  }

  @Get('transactions')
  transactions(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
    return this.resellers.transactions(user.sub, query);
  }

  @Get('reports/sales')
  sales(@CurrentUser() user: JwtPayload, @Query() query: ReportRangeQueryDto) {
    return this.resellers.salesReport(
      user.sub,
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }

  @Get('reports/commission')
  commission(@CurrentUser() user: JwtPayload, @Query() query: ReportRangeQueryDto) {
    return this.resellers.commissionReport(
      user.sub,
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }
}
