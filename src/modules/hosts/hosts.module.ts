import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { SecurityModule } from '../security/security.module';
import { HostsService } from './hosts.service';
import { AdminHostsController } from './admin-hosts.controller';

@Module({
  imports: [WalletModule, AuditModule, UsersModule, SecurityModule],
  controllers: [AdminHostsController],
  providers: [HostsService],
  exports: [HostsService],
})
export class HostsModule {}
