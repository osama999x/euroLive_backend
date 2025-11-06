import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { JwtCustomService } from './providers/jwt.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './entities';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User]), JwtModule],
  providers: [JwtCustomService, JwtAuthGuard],
  exports: [JwtCustomService, JwtAuthGuard, TypeOrmModule],
})
export class CommonModule {}

