import {
  Body,
  Controller,
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
import { UsersService } from './users.service';
import { BanService } from './ban.service';
import { CreateUserDto, OfficialUserDto } from './dto/create-user.dto';
import { CreateBanDto } from './dto/ban.dto';
import { UsersListQueryDto } from './dto/users-list-query.dto';
import { ActorType, BanDuration, BanType } from '../../common/enums';
import { AuditService } from '../audit/audit.service';

@ApiTags('Admin Users')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly users: UsersService,
    private readonly bans: BanService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'Create a consumer user (needed before Flutter auth exists)' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    const user = await this.users.create(dto);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'user.create',
      targetType: 'user',
      targetId: user.id,
      after: { publicId: user.publicId, username: user.username },
      meta,
    });
    return user;
  }

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT, StaffRole.MODERATOR)
  @ApiOperation({ summary: 'Search consumer users' })
  search(@Query() query: UsersListQueryDto) {
    return this.users.search(query);
  }

  @Get(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT, StaffRole.MODERATOR)
  @ApiOperation({ summary: 'User detail with idBanned / liveBanned flags' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findById(id).then((user) => this.bans.decorate(user));
  }

  @Get(':id/devices')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT, StaffRole.MODERATOR)
  @ApiOperation({ summary: 'Devices seen for this user' })
  devices(@Param('id', ParseUUIDPipe) id: string) {
    return this.bans.listDevices(id);
  }

  @Get(':id/bans')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT, StaffRole.MODERATOR)
  @ApiOperation({ summary: 'ID / device / live ban history' })
  bansList(@Param('id', ParseUUIDPipe) id: string) {
    return this.bans.list(id);
  }

  @Post(':id/bans')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MODERATOR)
  @ApiOperation({ summary: 'Ban by ID, device, or live streaming, with duration' })
  createBan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBanDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.bans.create(id, dto, actor, meta);
  }

  @Post(':id/bans/:banId/revoke')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MODERATOR)
  @ApiOperation({ summary: 'Lift one ID, device, or live ban row' })
  revokeBan(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('banId', ParseUUIDPipe) banId: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.bans.revoke(id, banId, actor, meta);
  }

  @Patch(':id/ban')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MODERATOR)
  @ApiOperation({ summary: 'Legacy permanent ID ban (prefer POST /bans)' })
  async ban(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.bans.create(
      id,
      { type: BanType.ID, duration: BanDuration.PERMANENT },
      actor,
      meta,
    );
  }

  @Patch(':id/unban')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MODERATOR)
  @ApiOperation({ summary: 'Lift active ID bans' })
  unban(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.bans.unbanId(id, actor, meta);
  }

  @Patch(':id/official')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark a user as protected Official' })
  async official(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OfficialUserDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    const saved = await this.users.setOfficial(id, dto.isOfficial, dto.officialId);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'user.official',
      targetType: 'user',
      targetId: id,
      after: { isOfficial: saved.isOfficial, officialId: saved.officialId },
      meta,
    });
    return this.users.toPublic(saved, true);
  }
}
