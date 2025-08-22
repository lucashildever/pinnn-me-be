import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BillingInfo } from './entities/billing-info.entity';
import { Invoice } from './entities/invoice.entity';

import { BillingsController } from './billings.controller';

import { BillingsService } from './billings.service';

@Module({
  imports: [TypeOrmModule.forFeature([BillingInfo, Invoice])],
  controllers: [BillingsController],
  providers: [BillingsService],
  exports: [TypeOrmModule],
})
export class BillingsModule {}
