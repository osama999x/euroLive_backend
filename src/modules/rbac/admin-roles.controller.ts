import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
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
import { RbacService } from './rbac.service';
import { AssignRolesDto, CreateStaffDto } from './dto/staff.dto';

@ApiTags('Admin Roles')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin')
export class AdminRolesController {
  constructor(private readonly rbac: RbacService) {}

  @Get('roles')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'List staff roles' })
  roles() {
    return this.rbac.listRoles();
  }

  @Get('permissions')
  @Roles(StaffRole.SUPER_ADMIN)
  permissions() {
    return this.rbac.listPermissions();
  }

  @Get('staff')
  @Roles(StaffRole.SUPER_ADMIN)
  staff() {
    return this.rbac.listStaff();
  }

  @Post('staff')
  @Roles(StaffRole.SUPER_ADMIN)
  createStaff(
    @Body() dto: CreateStaffDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.rbac.createStaff(dto, actor, meta);
  }

  @Patch('staff/:id/roles')
  @Roles(StaffRole.SUPER_ADMIN)
  assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.rbac.assignRoles(id, dto.roleSlugs, actor, meta);
  }
}
