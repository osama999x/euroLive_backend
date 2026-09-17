import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

interface SendMailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailer: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async send(options: SendMailOptions): Promise<void> {
    const host = this.configService.get<string>('mail.host');

    if (!host) {
      this.logger.warn(
        `Mail skipped (MAIL_HOST not set): ${options.subject} → ${options.to}`,
      );
      throw new Error('Email is not configured');
    }

    try {
      await this.mailer.sendMail({
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Mail sent: ${options.subject} → ${options.to}`);
    } catch (error) {
      this.logger.error(
        `Mail failed: ${options.subject} → ${options.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
