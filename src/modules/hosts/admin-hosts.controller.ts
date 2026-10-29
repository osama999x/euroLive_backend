import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { AccountTypes, CurrentUser, RequestMeta, RequestMetaDto, Roles } from '../../common/decorators';
import { AccountType, StaffRole } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto';
import { JwtPayload } from '../../common/interfaces';
import { HostsService } from './hosts.service';
import { CreateHostDto, FreezeReasonDto, ProtectionLockDto, UpdateHostDto } from '../agencies/dto/core.dto';

class HostListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  agencyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;
}

@ApiTags('Admin Hosts')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/hosts')
export class AdminHostsController {
  constructor(private readonly hosts: HostsService) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Create a host profile (new or existing user)' })
  create(
    @Body() dto: CreateHostDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.hosts.create(dto, actor, meta);
  }

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'List hosts' })
  list(@Query() query: HostListQueryDto) {
    return this.hosts.list(query);
  }

  @Get(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'Host detail' })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.hosts.withLive(await this.hosts.findById(id));
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Update host agency, country, or status' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHostDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.hosts.update(id, dto as never, actor, meta);
  }

  @Post(':id/protection-lock')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Master Host Protection Lock' })
  lock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProtectionLockDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.hosts.lockProtection(
      id,
      dto.reason,
      `MAN-${Date.now()}`,
      new Date(Date.now() + (dto.hours ?? 24) * 3600_000),
      actor,
    );
  }

  @Post(':id/protection-unlock')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Master unlock Host Protection' })
  unlock(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.hosts.unlockProtection(id, actor, meta);
  }

  @Post(':id/freeze')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Master freeze a host' })
  freeze(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FreezeReasonDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.hosts.freezeHost(id, dto.reason, actor, meta);
  }

  @Post(':id/unfreeze')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Master unfreeze a host' })
  unfreeze(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.hosts.unfreezeHost(id, actor, meta);
  }

  @Post(':id/live-ban')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MODERATOR)
  @ApiOperation({ summary: 'Ban this host from going live' })
  banLive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.hosts.banLive(id, actor, meta);
  }

  @Post(':id/live-unban')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MODERATOR)
  @ApiOperation({ summary: 'Lift this host live ban' })
  unbanLive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.hosts.unbanLive(id, actor, meta);
  }
}
