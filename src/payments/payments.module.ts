import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { PaymentMethod } from './entities/payment-method.entity';
import { Payment } from './entities/payment.entity';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { BillingsModule } from 'src/billings/billings.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentMethod]),
    UsersModule,
    BillingsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
