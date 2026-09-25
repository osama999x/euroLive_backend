import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';
import { SecurityModule } from '../security/security.module';
import { FraudService } from './fraud.service';
import { AdminFraudController } from './admin-fraud.controller';

@Module({
  imports: [WalletModule, AuditModule, SecurityModule],
  controllers: [AdminFraudController],
  providers: [FraudService],
  exports: [FraudService],
})
export class FraudModule {}
