import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser } from '../../common/decorators';
import { AccountType, ActorType, FreezeType, WalletOwnerType } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { DevicesService } from './devices.service';
import { FreezeService } from './freeze.service';
import { FreezeSelfDto } from '../agencies/dto/core.dto';

@ApiTags('App Security')
@ApiBearerAuth()
@AccountTypes(AccountType.USER)
@Controller('app')
export class AppSecurityController {
  constructor(
    private readonly devices: DevicesService,
    private readonly freeze: FreezeService,
  ) {}

  @Get('me/devices')
  @ApiOperation({ summary: 'List devices for the signed-in user' })
  devicesList(@CurrentUser() user: JwtPayload) {
    return this.devices.list(user.sub);
  }

  @Post('me/logout-all')
  @ApiOperation({ summary: 'Revoke all app sessions' })
  logoutAll(@CurrentUser() user: JwtPayload) {
    return this.devices.logoutAll(user.sub);
  }

  @Post('me/freeze')
  @ApiOperation({ summary: 'Self-freeze coins/account pending Master review' })
  freezeSelf(@CurrentUser() user: JwtPayload, @Body() dto: FreezeSelfDto) {
    return this.freeze.freeze({
      ownerType: WalletOwnerType.USER,
      ownerId: user.sub,
      freezeType: FreezeType.ACCOUNT,
      reason: dto.reason,
      actor: user,
      actorType: ActorType.USER,
    });
  }
}
