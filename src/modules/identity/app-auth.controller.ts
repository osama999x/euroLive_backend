import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentUser, Public } from '../../common/decorators';
import { AccountType } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AppLoginDto } from '../agencies/dto/core.dto';

@ApiTags('App Auth')
@Controller('app/auth')
export class AppAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Consumer / host login' })
  login(@Body() dto: AppLoginDto) {
    return this.auth.loginUser(dto.login, dto.password, dto.deviceId, dto.deviceName);
  }

  @Get('me')
  @AccountTypes(AccountType.USER)
  @ApiBearerAuth()
  async me(@CurrentUser() user: JwtPayload) {
    const row = await this.users.findById(user.sub);
    return this.users.toPublic(row);
  }
}
