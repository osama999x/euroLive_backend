import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BackupsService } from './backups.service';
import { AdminBackupsController } from './admin-backups.controller';

@Module({
  imports: [AuditModule],
  controllers: [AdminBackupsController],
  providers: [BackupsService],
  exports: [BackupsService],
})
export class BackupsModule {}
