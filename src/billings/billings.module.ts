import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BillingInfo } from './entities/billing-info.entity';
import { Transaction } from './entities/transaction.entity';

import { BillingsController } from './billings.controller';

import { BillingsService } from './billings.service';

@Module({
  imports: [TypeOrmModule.forFeature([BillingInfo, Transaction])],
  controllers: [BillingsController],
  providers: [BillingsService],
})
export class BillingsModule {}
