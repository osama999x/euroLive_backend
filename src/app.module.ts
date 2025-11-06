import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DataResponseInterceptor } from './common/interceptors/data-response.interceptor';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import mailConfig from './config/mail.config';
import environmentValidation from './config/environment.validation';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { JwtModule } from '@nestjs/jwt';
import { GlobalExceptionFilter } from './common/filters';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { CommonModule } from './common/common.module';
import { CityModule } from './city/city.module';
import { ReligionModule } from './religion/religion.module';
import { RishtanagarUsersModule } from './rishtanagar-users/users.module';
import { RishtanagarAuthenticationModule } from './rishtanagar-auth/authentication.module';
import * as entities from './common/entities';

const ENV = process.env.NODE_ENV;
@Module({
  imports: [
    /**
     * Static files
     */
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../', 'public'),
    }),
    /**
     * Environment Config
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${ENV}`].filter(Boolean),
      load: [appConfig, databaseConfig, mailConfig],
      validationSchema: environmentValidation,
    }),
    /**
     * TypeORM MySQL config
     */
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // ✅ Put console.log here
        console.log('database config', {
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          user: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.database'),
        });

        return {
          type: 'mysql',
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.database'),
          entities: Object.values(entities),
          synchronize:
            configService.get<string>('database.synchronize') === 'true',
          logging: configService.get<string>('database.logging') === 'true',
        };
      },
    }),

    /**
     * JWT Module
     */
    JwtModule.register({
      global: true,
    }),
    /**
     * Nodemailer config
     */
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('mail.mailHost'),
          port: configService.get<number>('mail.mailPort'),
          secure: true,
          auth: {
            user: configService.get<string>('mail.mailAddress'),
            pass: configService.get<string>('mail.mailPassword'),
          },
        },
        defaults: {
          from: `"RishtaNagar" <${configService.get<string>('mail.mailAddress')}>`,
        },
      }),
    }),
    /**
     * Application Modules
     */
    CommonModule,
    CityModule,
    ReligionModule,
    RishtanagarUsersModule,
    RishtanagarAuthenticationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    /**
     * Global Exception Filter
     */
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    /**
     * Global Interceptors
     */
    {
      provide: APP_INTERCEPTOR,
      useClass: DataResponseInterceptor,
    },
    /**
     * Global Guards - JWT Authentication
     */
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
