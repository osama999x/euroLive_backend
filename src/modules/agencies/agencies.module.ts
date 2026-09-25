import { Module, forwardRef } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';
import { SecurityModule } from '../security/security.module';
import { HostsModule } from '../hosts/hosts.module';
import { SalaryModule } from '../salary/salary.module';
import { AgenciesService } from './agencies.service';
import { AdminAgenciesController } from './admin-agencies.controller';
import { AgencyPortalController } from './agency-portal.controller';
import { AgencyGuard } from '../../common/guards';

@Module({
  imports: [
    WalletModule,
    AuditModule,
    SecurityModule,
    forwardRef(() => HostsModule),
    forwardRef(() => SalaryModule),
  ],
  controllers: [AdminAgenciesController, AgencyPortalController],
  providers: [AgenciesService, AgencyGuard],
  exports: [AgenciesService],
})
export class AgenciesModule {}
