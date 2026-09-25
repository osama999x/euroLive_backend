import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FreezeService } from './freeze.service';
import { DevicesService } from './devices.service';
import { AppSecurityController } from './app-security.controller';
import { AdminFreezeController } from './admin-freeze.controller';

@Module({
  imports: [AuditModule],
  controllers: [AppSecurityController, AdminFreezeController],
  providers: [FreezeService, DevicesService],
  exports: [FreezeService, DevicesService],
})
export class SecurityModule {}
