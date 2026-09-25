import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser, RequestMeta, RequestMetaDto, Roles } from '../../common/decorators';
import { AccountType, StaffRole } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto';
import { JwtPayload } from '../../common/interfaces';
import { FraudService } from './fraud.service';
import { ReviewFraudDto } from '../euro/dto/core.dto';

@ApiTags('Admin Fraud')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/fraud')
export class AdminFraudController {
  constructor(private readonly fraud: FraudService) {}

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  list(@Query() query: PaginationQueryDto) {
    return this.fraud.list(query);
  }

  @Post(':id/review')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Master fraud review: restore, ledger correct, penalty, or ban' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewFraudDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.fraud.review(id, dto.action, actor, { note: dto.note, amount: dto.amount }, meta);
  }
}
