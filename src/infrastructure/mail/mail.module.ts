import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('mail.host');
        const port = config.get<number>('mail.port');
        const user = config.get<string>('mail.user');
        const pass = config.get<string>('mail.password');

        if (!host) {
          return {
            transport: { jsonTransport: true },
            defaults: { from: config.get<string>('mail.from') },
          };
        }

        return {
          transport: {
            host,
            port,
            secure: port === 465,
            auth: user ? { user, pass } : undefined,
          },
          defaults: {
            from: config.get<string>('mail.from'),
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
