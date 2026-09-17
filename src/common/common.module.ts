import { Global, Module } from '@nestjs/common';
import {
  AccountTypeGuard,
  JwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from './guards';

@Global()
@Module({
  providers: [JwtAuthGuard, RolesGuard, AccountTypeGuard, PermissionsGuard],
  exports: [JwtAuthGuard, RolesGuard, AccountTypeGuard, PermissionsGuard],
})
export class CommonModule {}
