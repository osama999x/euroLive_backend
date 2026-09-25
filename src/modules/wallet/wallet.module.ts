import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module';
import { WalletService } from './wallet.service';

@Module({
  imports: [SecurityModule],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
