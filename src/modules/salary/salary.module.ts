import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';
import { HostsModule } from '../hosts/hosts.module';
import { SalaryService } from './salary.service';
import { AdminSalaryController } from './admin-salary.controller';

@Module({
  imports: [WalletModule, AuditModule, HostsModule],
  controllers: [AdminSalaryController],
  providers: [SalaryService],
  exports: [SalaryService],
})
export class SalaryModule {}
