import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser, RequestMeta, RequestMetaDto, Roles } from '../../common/decorators';
import { AccountType, StaffRole } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto';
import { JwtPayload } from '../../common/interfaces';
import { SosService } from './sos.service';
import { ResolveSosDto } from '../euro/dto/core.dto';

@ApiTags('Admin SOS')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/sos')
export class AdminSosController {
  constructor(private readonly sos: SosService) {}

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT)
  list(@Query() query: PaginationQueryDto) {
    return this.sos.list(query);
  }

  @Post(':id/ack')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT)
  ack(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.sos.ack(id, actor, actor.accountType ?? 'staff', meta);
  }

  @Post(':id/resolve')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Master resolve SOS' })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveSosDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.sos.resolve(id, dto.outcome, actor, meta);
  }
}
