import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { PaymentAttempt } from './entities/payment-attempt.entity';
import { Payment } from './entities/payment.entity';

import { BillingsModule } from 'src/billings/billings.module';
import { UsersModule } from 'src/users/users.module';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { StripeProvider } from './providers/stripe.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentAttempt]),
    BillingsModule,
    UsersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeProvider],
  exports: [PaymentsService, StripeProvider],
})
export class PaymentsModule {}
