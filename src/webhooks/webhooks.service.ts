import { Injectable } from '@nestjs/common';
import { BillingsService } from 'src/billings/billings.service';
import { PaymentsService } from 'src/payments/payments.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import Stripe from 'stripe';

@Injectable()
export class WebhookService {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private paymentsService: PaymentsService,
    private billingsService: BillingsService,
  ) {}

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
        return this.subscriptionsService.handleSubscriptionCreated(
          event.data.object,
        );

      case 'customer.subscription.deleted':
        return this.subscriptionsService.handleSubscriptionDeleted(
          event.data.object,
        );

      case 'invoice.payment_succeeded':
        return this.paymentsService.handleInvoicePaymentSucceeded(
          event.data.object,
        );

      case 'invoice.payment_failed':
        return this.paymentsService.handleInvoicePaymentFailed(
          event.data.object,
        );

      // case 'checkout.session.completed': // Se usar Checkout
      //   return this.subscriptionsService.handleCheckoutSessionCompleted(event.data.object);
    }
  }
}
