import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser, Public } from '../../common/decorators';
import { AccountType } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { AuthService } from './auth.service';
import { AgenciesService } from '../agencies/agencies.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Agency Auth')
@Controller('agency/auth')
export class AgencyAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly agencies: AgenciesService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Agency portal login' })
  login(@Body() dto: LoginDto) {
    return this.auth.loginAgency(dto.login, dto.password);
  }

  @Get('me')
  @AccountTypes(AccountType.AGENCY)
  @ApiBearerAuth()
  async me(@CurrentUser() user: JwtPayload) {
    const row = await this.agencies.findById(user.sub);
    return this.agencies.toPublic(row);
  }
}
