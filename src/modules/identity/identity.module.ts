import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { AdminAuthController } from './admin-auth.controller';
import { ResellerAuthController } from './reseller-auth.controller';
import { AuthController } from './auth.controller';
import { ResellersModule } from '../resellers/resellers.module';

@Module({
  imports: [ResellersModule],
  controllers: [AdminAuthController, ResellerAuthController, AuthController],
  providers: [AuthService, PasswordResetService],
  exports: [AuthService],
})
export class IdentityModule {}
