import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { HostsModule } from '../hosts/hosts.module';
import { SosService } from './sos.service';
import { AdminSosController } from './admin-sos.controller';
import { ResellerSosController } from './reseller-sos.controller';

@Module({
  imports: [AuditModule, HostsModule],
  controllers: [AdminSosController, ResellerSosController],
  providers: [SosService],
  exports: [SosService],
})
export class SosModule {}
