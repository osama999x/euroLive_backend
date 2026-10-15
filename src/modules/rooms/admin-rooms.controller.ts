import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, Roles } from '../../common/decorators';
import { AccountType, StaffRole } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto';
import { RoomsService } from './rooms.service';

@ApiTags('Admin Rooms')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/rooms')
export class AdminRoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MODERATOR)
  @ApiOperation({ summary: 'List rooms' })
  list(@Query() query: PaginationQueryDto) {
    return this.rooms.adminList(query);
  }
}
