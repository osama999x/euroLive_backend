import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser, RequestMeta, RequestMetaDto, Roles } from '../../common/decorators';
import { AccountType, StaffRole } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto';
import { JwtPayload } from '../../common/interfaces';
import { BackupsService } from './backups.service';
import { BackupSettingsDto } from '../euro/dto/core.dto';

@ApiTags('Admin Backups')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/backups')
export class AdminBackupsController {
  constructor(private readonly backups: BackupsService) {}

  @Get('settings')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  settings() {
    return this.backups.getSettings();
  }

  @Patch('settings')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update backup schedule; disable requires Master password/2FA' })
  update(
    @Body() dto: BackupSettingsDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.backups.updateSettings(dto, actor, meta);
  }

  @Post('run')
  @Roles(StaffRole.SUPER_ADMIN)
  run(@CurrentUser() actor: JwtPayload, @RequestMeta() meta: RequestMetaDto) {
    return this.backups.run(actor, true, meta);
  }

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  list(@Query() query: PaginationQueryDto) {
    return this.backups.list(query);
  }
}
