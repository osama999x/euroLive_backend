import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReligionController } from './religion.controller';
import { ReligionService } from './religion.service';
import { Religion } from '../common/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Religion])],
  controllers: [ReligionController],
  providers: [ReligionService],
  exports: [ReligionService],
})
export class ReligionModule {}

