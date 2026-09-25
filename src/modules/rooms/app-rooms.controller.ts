import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser } from '../../common/decorators';
import { AccountType } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { RoomsService } from './rooms.service';
import { RoomUserDto } from '../euro/dto/core.dto';

@ApiTags('App Rooms')
@ApiBearerAuth()
@AccountTypes(AccountType.USER)
@Controller('app/rooms')
export class AppRoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post(':id/mute')
  @ApiOperation({ summary: 'Room admin mute-only' })
  mute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RoomUserDto,
  ) {
    return this.rooms.mute(id, user.sub, dto.userId, false, dto.reason);
  }
}
