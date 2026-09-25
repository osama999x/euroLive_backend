import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser } from '../../common/decorators';
import { AccountType, ComplaintType } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { ComplaintsService } from './complaints.service';
import { CreateReportDto } from '../euro/dto/core.dto';

@ApiTags('App Reports')
@ApiBearerAuth()
@AccountTypes(AccountType.USER)
@Controller('app')
export class AppReportsController {
  constructor(private readonly complaints: ComplaintsService) {}

  @Post('reports')
  @ApiOperation({ summary: 'User Report Center' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReportDto) {
    return this.complaints.create({
      type: dto.type ?? ComplaintType.USER_REPORT,
      reporterId: user.sub,
      reporterType: 'user',
      targetId: dto.targetId,
      targetType: dto.targetType ?? 'user',
      summary: dto.summary,
      severity: dto.severity,
      evidence: dto.evidence,
      protectionLock: dto.protectionLock,
    });
  }
}
