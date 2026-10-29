import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountTypes, CurrentUser, RequestMeta, RequestMetaDto, Roles } from '../../common/decorators';
import { AccountType, AgencyStatus, StaffRole } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto';
import { JwtPayload } from '../../common/interfaces';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto, FreezeReasonDto, UpdateAgencyDto } from './dto/core.dto';

class AgencyListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ enum: AgencyStatus })
  @IsOptional()
  @IsEnum(AgencyStatus)
  status?: AgencyStatus;
}

@ApiTags('Admin Agencies')
@ApiBearerAuth()
@AccountTypes(AccountType.STAFF)
@Controller('admin/agencies')
export class AdminAgenciesController {
  constructor(private readonly agencies: AgenciesService) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Create an agency portal account' })
  create(
    @Body() dto: CreateAgencyDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.agencies.create(dto, actor, meta);
  }

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
  @ApiOperation({ summary: 'List agencies' })
  list(@Query() query: AgencyListQueryDto) {
    return this.agencies.list(query);
  }

  @Get(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.FINANCE)
  @ApiOperation({ summary: 'Agency detail' })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.agencies.toPublic(await this.agencies.findById(id));
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN)
  @ApiOperation({ summary: 'Update agency profile / status / share percent' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgencyDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.agencies.update(id, dto, actor, meta);
  }

  @Post(':id/freeze')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Master freeze an agency' })
  freeze(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FreezeReasonDto,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.agencies.freezeAgency(id, dto.reason, actor, meta);
  }

  @Post(':id/unfreeze')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Master unfreeze an agency' })
  unfreeze(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
    @RequestMeta() meta: RequestMetaDto,
  ) {
    return this.agencies.unfreezeAgency(id, actor, meta);
  }
}
