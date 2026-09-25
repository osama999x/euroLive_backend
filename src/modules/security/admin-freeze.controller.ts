import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser, RequestMeta, RequestMetaDto, Roles } from '../../common/decorators';
import { AccountType, FreezeStatus, StaffRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { PaginationQueryDto } from '../../common/dto';
import { FreezeService } from './freeze.service';
import { AdminFreezeDto, ReviewFreezeDto } from '../euro/dto/core.dto';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class FreezeListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: FreezeStatus })
  @IsOptional()
  @IsEnum(FreezeStatus)
  status?: FreezeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

@ApiTags('Admin Freezes')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/freezes')
export class AdminFreezeController {
  constructor(private readonly freeze: FreezeService) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Master freeze of an account/wallet' })
  create(
    @Body() dto: AdminFreezeDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.freeze.freeze({
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      freezeType: dto.freezeType,
      reason: dto.reason,
      actor,
      actorType: actor.accountType as never,
      meta,
    });
  }

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  list(@Query() query: FreezeListQueryDto) {
    return this.freeze.list(query);
  }

  @Post(':id/review')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Master review of a freeze' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewFreezeDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.freeze.review(id, dto.action, actor, dto.note, meta);
  }
}
