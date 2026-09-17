import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../users/users.module';
import { CatalogModule } from '../catalog/catalog.module';
import { AuditModule } from '../audit/audit.module';
import { ResellersService } from './resellers.service';
import { AdminResellersController } from './admin-resellers.controller';
import { ResellerPortalController } from './reseller-portal.controller';

@Module({
  imports: [WalletModule, UsersModule, CatalogModule, AuditModule],
  controllers: [AdminResellersController, ResellerPortalController],
  providers: [ResellersService],
  exports: [ResellersService],
})
export class ResellersModule {}
