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
import { CreateUserDto } from './dto/create-user.dto';
import { UsersListQueryDto } from './dto/users-list-query.dto';
import { ActorType } from '../../common/enums';
import { AuditService } from '../audit/audit.service';

@ApiTags('Admin Users')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly users: UsersService,
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
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findById(id);
  }

  @Patch(':id/ban')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MODERATOR)
  async ban(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    const before = await this.users.findById(id);
    const user = await this.users.setBanned(id, true);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'user.ban',
      targetType: 'user',
      targetId: id,
      before: { status: before.status },
      after: { status: user.status },
      meta,
    });
    return user;
  }

  @Patch(':id/unban')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MODERATOR)
  async unban(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    const before = await this.users.findById(id);
    const user = await this.users.setBanned(id, false);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'user.unban',
      targetType: 'user',
      targetId: id,
      before: { status: before.status },
      after: { status: user.status },
      meta,
    });
    return user;
  }
}
