import { Module } from '@nestjs/common';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { TokenModule } from './jwt/token.module';

@Module({
  imports: [RedisModule, MailModule, TokenModule],
  exports: [RedisModule, MailModule, TokenModule],
})
export class InfrastructureModule {}
