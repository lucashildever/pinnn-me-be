import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PaymentsService } from '../payments/payments.service';

import Stripe from 'stripe';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,

    @Inject('STRIPE') private readonly stripe: Stripe,
  ) {}

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('stripe.webhookKey');

    if (!webhookSecret) {
      throw new Error('Webhook key not defined in environment variables');
    }

    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case 'customer.subscription.created':
        return this.subscriptionsService.handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
        );

      case 'customer.subscription.deleted':
        return this.subscriptionsService.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );

      case 'invoice.payment_succeeded':
        return this.paymentsService.handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );

      case 'invoice.payment_failed':
        return this.paymentsService.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );

      case 'checkout.session.completed':
        return;
      //   return this.subscriptionsService.handleCheckoutSessionCompleted(
      //     event.data.object as Stripe.Checkout.Session
      //   );

      default:
        // Ignora eventos não tratados (não é erro)
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
}
