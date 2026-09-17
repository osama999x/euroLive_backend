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
import { CatalogService } from './catalog.service';
import { CreateCatalogItemDto, UpdateCatalogItemDto } from './dto/catalog-item.dto';
import { CatalogListQueryDto } from './dto/catalog-list-query.dto';
import { AuditService } from '../audit/audit.service';
import { ActorType } from '../../common/enums';

@ApiTags('Admin Catalog')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a frame, entry, or badge' })
  async create(
    @Body() dto: CreateCatalogItemDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    const item = await this.catalog.create(dto);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'catalog.create',
      targetType: 'catalog_item',
      targetId: item.id,
      after: { type: item.type, name: item.name },
      meta,
    });
    return item;
  }

  @Get()
  list(@Query() query: CatalogListQueryDto) {
    return this.catalog.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogItemDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    const before = await this.catalog.findById(id);
    const item = await this.catalog.update(id, dto);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'catalog.update',
      targetType: 'catalog_item',
      targetId: id,
      before: { name: before.name, price: before.price, resellerAccess: before.resellerAccess },
      after: { name: item.name, price: item.price, resellerAccess: item.resellerAccess },
      meta,
    });
    return item;
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    await this.catalog.remove(id);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'catalog.delete',
      targetType: 'catalog_item',
      targetId: id,
      meta,
    });
    return { deleted: true };
  }
}
