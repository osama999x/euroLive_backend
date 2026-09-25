import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { AdminAuthController } from './admin-auth.controller';
import { ResellerAuthController } from './reseller-auth.controller';
import { AuthController } from './auth.controller';
import { AppAuthController } from './app-auth.controller';
import { AgencyAuthController } from './agency-auth.controller';
import { ResellersModule } from '../resellers/resellers.module';
import { UsersModule } from '../users/users.module';
import { AgenciesModule } from '../agencies/agencies.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [ResellersModule, UsersModule, AgenciesModule, SecurityModule],
  controllers: [
    AdminAuthController,
    ResellerAuthController,
    AuthController,
    AppAuthController,
    AgencyAuthController,
  ],
  providers: [AuthService, PasswordResetService],
  exports: [AuthService],
})
export class IdentityModule {}
