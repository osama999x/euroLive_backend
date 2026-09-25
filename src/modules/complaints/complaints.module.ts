import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { HostsModule } from '../hosts/hosts.module';
import { ComplaintsService } from './complaints.service';
import { AdminComplaintsController } from './admin-complaints.controller';
import { AppReportsController } from './app-reports.controller';

@Module({
  imports: [AuditModule, HostsModule],
  controllers: [AdminComplaintsController, AppReportsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
