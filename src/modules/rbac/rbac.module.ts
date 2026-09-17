import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RbacService } from './rbac.service';
import { AdminRolesController } from './admin-roles.controller';

@Module({
  imports: [AuditModule],
  controllers: [AdminRolesController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
