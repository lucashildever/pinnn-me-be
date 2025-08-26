import { Module } from '@nestjs/common';

import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { BillingsModule } from 'src/billings/billings.module';
import { PlansModule } from 'src/plans/plans.module';

import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [PaymentsModule, SubscriptionsModule, PlansModule, BillingsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
