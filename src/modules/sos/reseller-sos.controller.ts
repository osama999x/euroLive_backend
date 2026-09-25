import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccountTypes,
  CurrentUser,
  RequestMeta,
  RequestMetaDto,
  RequirePermissions,
} from '../../common/decorators';
import { AccountType, ActorType, ResellerPermissionFlag } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { SosService } from '../sos/sos.service';

@ApiTags('Reseller SOS')
@ApiBearerAuth()
@AccountTypes(AccountType.RESELLER)
@Controller('reseller/sos')
export class ResellerSosController {
  constructor(private readonly sos: SosService) {}

  @Post(':id/ack')
  @RequirePermissions(ResellerPermissionFlag.SOS)
  @ApiOperation({ summary: 'Assigned official/reseller ack of an SOS' })
  ack(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.sos.ack(id, actor, ActorType.RESELLER, meta);
  }
}
