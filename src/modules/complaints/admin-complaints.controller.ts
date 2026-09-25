import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser, RequestMeta, RequestMetaDto, Roles } from '../../common/decorators';
import { AccountType, StaffRole } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto';
import { JwtPayload } from '../../common/interfaces';
import { ComplaintsService } from './complaints.service';
import { ReviewComplaintDto } from '../euro/dto/core.dto';

@ApiTags('Admin Complaints')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/complaints')
export class AdminComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT, StaffRole.MODERATOR)
  list(@Query() query: PaginationQueryDto) {
    return this.complaints.list(query);
  }

  @Get(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload) {
    return this.complaints.getById(id, this.complaints.isMaster(actor));
  }

  @Post(':id/review')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Master fair-review: confirm/reject never auto-penalize' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewComplaintDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.complaints.review(id, dto, actor, meta);
  }
}
