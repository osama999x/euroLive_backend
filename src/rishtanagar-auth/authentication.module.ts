import { Module } from '@nestjs/common';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './providers/authentication.service';
import { RishtanagarUsersModule } from '../rishtanagar-users/users.module';
import { JwtCustomService } from '../common/providers/jwt.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    RishtanagarUsersModule,
    JwtModule.register({}), // Configuration will come from ConfigModule
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, JwtCustomService],
  exports: [AuthenticationService],
})
export class RishtanagarAuthenticationModule {}

