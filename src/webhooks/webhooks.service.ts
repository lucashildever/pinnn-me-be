import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PaymentsService } from '../payments/payments.service';
import { BillingsService } from 'src/billings/billings.service';
import { PlansService } from 'src/plans/plans.service';

import { UpdateBillingInfoDto } from 'src/billings/dto/update-billing-info.dto';
import { CreateInvoiceDto } from 'src/billings/dto/create-invoice.dto';
import { CreatePaymentDto } from 'src/payments/dto/create-payment.dto';
import { PaymentAttempt } from 'src/payments/entities/payment-attempt.entity';

import Stripe from 'stripe';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Inject('STRIPE') private readonly stripe: Stripe,

    private readonly subscriptionsService: SubscriptionsService,
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
    private readonly plansService: PlansService,
    private readonly billingsService: BillingsService,
  ) {}

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('stripe.webhookKey');

    if (!webhookSecret) {
      this.logger.error('Webhook key not defined in environment variables');
      throw new Error('Webhook key not defined in environment variables');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new Error(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'checkout.session.expired':
          await this.handleCheckoutSessionExpired(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
            event.data.previous_attributes as Partial<Stripe.Subscription>,
          );
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'invoice.created':
          await this.handleInvoiceCreated(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(
            event.data.object as Stripe.Invoice,
          );
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice,
          );
          break;

        case 'payment_intent.created':
        case 'payment_intent.succeeded':
        case 'charge.succeeded':
          // Just acknowledge the event, no specific action needed for MVP
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Error handling webhook event ${event.type}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    const userId = session.metadata?.userId;
    const name = session.customer_details?.name;

    if (!userId) {
      this.logger.warn('userId not defined in stripe session metadata');
      return;
    }

    const billingInfo: UpdateBillingInfoDto = {};
    if (name) billingInfo.name = name;
    if (session.currency) billingInfo.currency = session.currency.toUpperCase();

    if (Object.keys(billingInfo).length > 0) {
      await this.billingsService.updateBillingInfo(userId, billingInfo);
    }

    // Determine status based on payment_status
    const isPaymentComplete = session.payment_status === 'paid';

    const paymentAttempt: Partial<PaymentAttempt> = {
      status: isPaymentComplete ? 'succeeded' : 'processing',
      metadata: {
        subscriptionId: session.subscription as string,
      },
    };

    this.logger.log(
      `Checkout session completed. Session: ${session.id}, PaymentStatus: ${session.payment_status}, Status: ${paymentAttempt.status}`,
    );

    await this.paymentsService.updatePaymentAttemptBySessionId(
      session.id,
      paymentAttempt,
    );

    // Note: Invoice creation is handled by invoice.created event usually,
    // but for one-time payments or initial subscription, Stripe generates an invoice.
    // We rely on invoice.created/paid events for invoice management.
  }

  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
    await this.paymentsService.updatePaymentAttemptBySessionId(session.id, {
      status: 'cancelled',
    });
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0].price.id;

    const billingInfo =
      await this.billingsService.findBillingInfoByCustomerId(customerId);

    if (!billingInfo) {
      this.logger.warn(
        `BillingInfo not found for customer ${customerId}. Ignoring subscription event.`,
      );
      return;
    }

    await this.subscriptionsService.handleSubscriptionChange({
      userId: billingInfo.userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      currentPeriodEnd: new Date(
        (subscription as any).current_period_end * 1000,
      ),
    });
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
    previousAttributes: Partial<Stripe.Subscription>,
  ) {
    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0].price.id;

    const billingInfo =
      await this.billingsService.findBillingInfoByCustomerId(customerId);

    if (!billingInfo) {
      this.logger.warn(
        `BillingInfo not found for customer ${customerId}. Ignoring subscription update.`,
      );
      return;
    }

    await this.subscriptionsService.handleSubscriptionChange({
      userId: billingInfo.userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      currentPeriodEnd: new Date(
        (subscription as any).current_period_end * 1000,
      ),
    });

    if (previousAttributes?.status) {
      const prevStatus = previousAttributes.status;
      const currentStatus = subscription.status;

      if (prevStatus !== currentStatus) {
        this.logger.log(
          `Subscription ${subscription.id} status changed: ${prevStatus} -> ${currentStatus}`,
        );
        // Logic for specific transitions can be added here if needed beyond just updating status
        // e.g., sending emails, specific internal flags, etc.
        // Currently, SubscriptionsService.handleSubscriptionChange updates the status which is sufficient for access control.
      }
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0].price.id;

    const billingInfo =
      await this.billingsService.findBillingInfoByCustomerId(customerId);

    if (!billingInfo) {
      this.logger.warn(
        `BillingInfo not found for customer ${customerId}. Ignoring subscription deletion.`,
      );
      return;
    }

    await this.subscriptionsService.handleSubscriptionChange({
      userId: billingInfo.userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: 'canceled',
      currentPeriodEnd: new Date(
        (subscription as any).current_period_end * 1000,
      ),
    });
  }

  private async handleInvoiceCreated(stripeInvoice: Stripe.Invoice) {
    if (!stripeInvoice.id) return;

    const customerId = stripeInvoice.customer as string;
    const billingInfo =
      await this.billingsService.findBillingInfoByCustomerId(customerId);

    if (!billingInfo) {
      this.logger.warn(
        `BillingInfo not found for customer ${customerId}. Ignoring invoice creation.`,
      );
      return;
    }

    let localSubscriptionId: string | undefined;
    const stripeSubscriptionId = (stripeInvoice as any).subscription;
    const actualStripeSubId =
      typeof stripeSubscriptionId === 'string'
        ? stripeSubscriptionId
        : stripeSubscriptionId?.id;

    if (actualStripeSubId) {
      const sub =
        await this.subscriptionsService.findByStripeSubscriptionId(
          actualStripeSubId,
        );
      if (sub) {
        localSubscriptionId = sub.id;
      }
    }

    const createInvoiceDto: CreateInvoiceDto = {
      userId: billingInfo.userId,
      billingInfoId: billingInfo.id,
      subscriptionId: localSubscriptionId,
      type: 'subscription',
      amount: stripeInvoice.amount_due / 100,
      currency: stripeInvoice.currency.toUpperCase(),
      stripeInvoiceId: stripeInvoice.id,
      description: stripeInvoice.description || undefined,
    };

    await this.billingsService.createInvoice(createInvoiceDto);
  }

  private async handleInvoicePaymentSucceeded(stripeInvoice: Stripe.Invoice) {
    if (!stripeInvoice.id) return;

    const invoice = await this.billingsService.findInvoiceInstanceById(
      stripeInvoice.id,
    );

    if (!invoice) {
      this.logger.warn(
        `Invoice not found for Stripe invoice: ${stripeInvoice.id}`,
      );
      return;
    }

    // Fetch full invoice from Stripe to ensure we have all data
    let fullStripeInvoice = stripeInvoice;
    let chargeId: string | undefined = (stripeInvoice as any).charge;
    let subscriptionId: string | undefined = (stripeInvoice as any)
      .subscription;
    let paymentIntentId: string | undefined = (stripeInvoice as any)
      .payment_intent;
    let paymentAttempt: PaymentAttempt | null = null;

    try {
      if (
        !chargeId ||
        typeof chargeId !== 'string' ||
        !subscriptionId ||
        typeof subscriptionId !== 'string'
      ) {
        fullStripeInvoice = await this.stripe.invoices.retrieve(
          stripeInvoice.id,
          { expand: ['charge', 'payment_intent', 'subscription'] },
        );
      }

      // Extract charge (can be string ID or object)
      const ch = (fullStripeInvoice as any).charge;
      chargeId = typeof ch === 'string' ? ch : ch?.id;

      // if chargeId is still null, try to get from payment_intent
      if (!chargeId) {
        const pi = (fullStripeInvoice as any).payment_intent;
        paymentIntentId = typeof pi === 'string' ? pi : pi?.id;

        this.logger.log(
          `Attempting to fetch PaymentIntent: ${paymentIntentId}`,
        );

        if (paymentIntentId) {
          const paymentIntent =
            await this.stripe.paymentIntents.retrieve(paymentIntentId);
          const latestCharge = paymentIntent.latest_charge;
          chargeId =
            typeof latestCharge === 'string' ? latestCharge : latestCharge?.id;

          this.logger.debug(`Fetched PaymentIntent. LatestCharge: ${chargeId}`);
        }
      }

      // 1. Extract subscription and basic data
      // Check top-level first, then lines, then parent
      const sub = (fullStripeInvoice as any).subscription;
      subscriptionId = typeof sub === 'string' ? sub : sub?.id;

      if (!subscriptionId && fullStripeInvoice.lines?.data?.length > 0) {
        const lineItem = fullStripeInvoice.lines.data[0];
        const lineSub = (lineItem as any).subscription;
        subscriptionId = typeof lineSub === 'string' ? lineSub : lineSub?.id;
      }

      if (!subscriptionId) {
        const parentSub = (fullStripeInvoice as any).parent
          ?.subscription_details?.subscription;
        subscriptionId =
          typeof parentSub === 'string' ? parentSub : parentSub?.id;
      }

      // 2. Find PaymentAttempt (Critical for linking and fallback)
      paymentAttempt = null;

      // Try via Subscription Metadata (DB or Stripe)
      if (subscriptionId) {
        paymentAttempt =
          await this.paymentsService.findPaymentAttemptBySubscriptionId(
            subscriptionId,
          );

        if (!paymentAttempt) {
          try {
            const subscription =
              await this.stripe.subscriptions.retrieve(subscriptionId);
            const storedPaymentAttemptId =
              subscription.metadata?.paymentAttemptId;
            if (storedPaymentAttemptId) {
              paymentAttempt =
                await this.paymentsService.findPaymentAttemptById(
                  storedPaymentAttemptId,
                );
            }
          } catch (err) {
            this.logger.warn(
              `Could not retrieve subscription ${subscriptionId}: ${err.message}`,
            );
          }
        }
      }

      // Fallback: Invoice/Line Metadata
      if (!paymentAttempt) {
        const invoiceMetadataPaymentAttemptId =
          stripeInvoice.metadata?.paymentAttemptId ||
          (fullStripeInvoice as any).metadata?.paymentAttemptId;
        if (invoiceMetadataPaymentAttemptId) {
          paymentAttempt = await this.paymentsService.findPaymentAttemptById(
            invoiceMetadataPaymentAttemptId,
          );
        } else if (fullStripeInvoice.lines?.data?.length > 0) {
          const lineMetaId =
            fullStripeInvoice.lines.data[0].metadata?.paymentAttemptId;
          if (lineMetaId) {
            paymentAttempt =
              await this.paymentsService.findPaymentAttemptById(lineMetaId);
          }
        }
      }

      if (paymentAttempt) {
        this.logger.log(`Found PaymentAttempt: ${paymentAttempt.id}`);
      } else {
        this.logger.warn(
          `PaymentAttempt NOT found for invoice ${stripeInvoice.id}`,
        );
      }

      // Repair subscription link (Deferred check using full data)
      if (!invoice.subscriptionId && subscriptionId) {
        const sub =
          await this.subscriptionsService.findByStripeSubscriptionId(
            subscriptionId,
          );
        if (sub) {
          await this.billingsService.updateInvoice(invoice.id, {
            subscriptionId: sub.id,
          });
          this.logger.log(
            `Repaired missing subscription link for invoice ${invoice.id} -> ${sub.id}`,
          );
          invoice.subscriptionId = sub.id;
        }
      }

      // 3. Ensure Charge ID (Heuristic: Find latest PI for Customer)
      if (!chargeId && (fullStripeInvoice as any).customer) {
        const customerId =
          typeof (fullStripeInvoice as any).customer === 'string'
            ? (fullStripeInvoice as any).customer
            : (fullStripeInvoice as any).customer?.id;

        try {
          const paymentIntents = await this.stripe.paymentIntents.list({
            customer: customerId,
            limit: 1,
          });

          if (paymentIntents.data.length > 0) {
            const recentPI = paymentIntents.data[0];
            // Basic verification: checks if it's succeeded.
            if (recentPI.status === 'succeeded') {
              const extractedCharge = recentPI.latest_charge;
              chargeId =
                typeof extractedCharge === 'string'
                  ? extractedCharge
                  : extractedCharge?.id;
              this.logger.debug(
                `Fetched Charge from Customer's Latest PI: ${chargeId}, PI: ${recentPI.id}`,
              );

              if (!paymentIntentId) paymentIntentId = recentPI.id;
            }
          }
        } catch (err) {
          this.logger.warn(
            `Error fetching PIs for customer fallback: ${err.message}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        `Could not retrieve full invoice/payment details from Stripe: ${err.message}`,
      );
    }

    this.logger.log(
      `Processing invoice payment succeeded. Invoice: ${invoice.id}, Charge: ${chargeId}`,
    );

    await this.billingsService.updateInvoiceStatus(invoice.id, 'completed');

    const createPaymentDto: CreatePaymentDto = {
      invoiceId: invoice.id,
      stripeChargeId: chargeId || undefined,
      amount: fullStripeInvoice.amount_paid / 100,
      currency: fullStripeInvoice.currency?.toUpperCase() || 'BRL',
      status: 'succeeded',
      originAttemptId: paymentAttempt?.id,
    };

    await this.paymentsService.createPayment(createPaymentDto);
  }

  private async handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice) {
    if (!stripeInvoice.id) return;

    const invoice = await this.billingsService.findInvoiceInstanceById(
      stripeInvoice.id,
    );

    if (invoice) {
      await this.billingsService.updateInvoiceStatus(invoice.id, 'failed');
    }

    // Try to find payment attempt by subscriptionId
    const subscriptionId = (stripeInvoice as any).subscription as string;
    if (subscriptionId) {
      const paymentAttempt =
        await this.paymentsService.findPaymentAttemptBySubscriptionId(
          subscriptionId,
        );

      if (paymentAttempt) {
        await this.paymentsService.updatePaymentAttemptById(paymentAttempt.id, {
          status: 'failed',
        });
      }
    }
  }
}
