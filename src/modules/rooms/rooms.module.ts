import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { RoomsService } from './rooms.service';
import { AdminRoomsController } from './admin-rooms.controller';
import { AppRoomsController } from './app-rooms.controller';

@Module({
  imports: [AuditModule, UsersModule],
  controllers: [AdminRoomsController, AppRoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
