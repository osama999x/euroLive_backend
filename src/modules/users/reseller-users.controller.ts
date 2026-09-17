import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes } from '../../common/decorators';
import { AccountType } from '../../common/enums';
import { UsersService } from './users.service';
import { WalletService } from '../wallet/wallet.service';
import { WalletOwnerType } from '../../common/enums';

@ApiTags('Reseller Users')
@ApiBearerAuth()
@AccountTypes(AccountType.RESELLER)
@Controller('reseller/users')
export class ResellerUsersController {
  constructor(
    private readonly users: UsersService,
    private readonly wallets: WalletService,
  ) {}

  @Get(':publicId')
  @ApiOperation({ summary: 'Look up a consumer user by public ID' })
  async lookup(@Param('publicId') publicId: string) {
    const user = await this.users.findByPublicId(publicId);
    const wallet = await this.wallets.getWallet(WalletOwnerType.USER, user.id);
    return {
      id: user.id,
      publicId: user.publicId,
      username: user.username,
      displayName: user.displayName,
      country: user.country,
      status: user.status,
      coinBalance: wallet.coinBalance,
    };
  }
}
