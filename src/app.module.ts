import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  appConfig,
  databaseConfig,
  envValidationSchema,
  jwtConfig,
  mailConfig,
  redisConfig,
} from './config';
import { CommonModule } from './common/common.module';
import { HttpExceptionFilter } from './common/filters';
import {
  AccountTypeGuard,
  JwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from './common/guards';
import { LoggingInterceptor, TransformInterceptor } from './common/interceptors';
import { DatabaseModule } from './database/database.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { HealthModule } from './modules/health/health.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ResellersModule } from './modules/resellers/resellers.module';
import { IdentityModule } from './modules/identity/identity.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AdminModule } from './modules/admin/admin.module';
import { SeedModule } from './modules/seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV}`],
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, mailConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('app.throttleTtl'),
            limit: config.get<number>('app.throttleLimit'),
          },
        ],
      }),
    }),
    DatabaseModule,
    InfrastructureModule,
    CommonModule,
    HealthModule,
    RealtimeModule,
    WalletModule,
    AuditModule,
    UsersModule,
    CatalogModule,
    ResellersModule,
    IdentityModule,
    RbacModule,
    AdminModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AccountTypeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
