import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { ResellersModule } from '../resellers/resellers.module';
import { AuditModule } from '../audit/audit.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminWalletsController } from '../wallet/admin-wallets.controller';

@Module({
  imports: [WalletModule, ResellersModule, AuditModule],
  controllers: [AdminDashboardController, AdminWalletsController],
})
export class AdminModule {}

