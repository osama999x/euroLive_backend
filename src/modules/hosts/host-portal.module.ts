import { Module } from '@nestjs/common';
import { HostsModule } from '../hosts/hosts.module';
import { RoomsModule } from '../rooms/rooms.module';
import { ComplaintsModule } from '../complaints/complaints.module';
import { SosModule } from '../sos/sos.module';
import { SalaryModule } from '../salary/salary.module';
import { UsersModule } from '../users/users.module';
import { HostPortalController } from './host-portal.controller';
import { HostGuard } from '../../common/guards';

@Module({
  imports: [HostsModule, RoomsModule, ComplaintsModule, SosModule, SalaryModule, UsersModule],
  controllers: [HostPortalController],
  providers: [HostGuard],
})
export class HostPortalModule {}
