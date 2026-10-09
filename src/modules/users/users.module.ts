import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';
import { UsersService } from './users.service';
import { BanService } from './ban.service';
import { AdminUsersController } from './admin-users.controller';
import { ResellerUsersController } from './reseller-users.controller';

@Module({
  imports: [WalletModule, AuditModule],
  controllers: [AdminUsersController, ResellerUsersController],
  providers: [UsersService, BanService],
  exports: [UsersService, BanService],
})
export class UsersModule {}
