import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { SeedService } from './seed.service';

@Module({
  imports: [WalletModule],
  providers: [SeedService],
})
export class SeedModule {}
