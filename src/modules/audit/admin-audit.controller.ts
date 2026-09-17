import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, Roles } from '../../common/decorators';
import { AccountType, StaffRole } from '../../common/enums';
import { AuditService } from './audit.service';
import { AuditListQueryDto } from './dto/audit-list-query.dto';

@ApiTags('Admin Audit')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Immutable admin/reseller action log' })
  list(@Query() query: AuditListQueryDto) {
    return this.audit.list(query);
  }
}
