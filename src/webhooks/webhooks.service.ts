import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PaymentsService } from '../payments/payments.service';
import { BillingsService } from 'src/billings/billings.service';
import { PlansService } from 'src/plans/plans.service';

import { UpdateBillingInfoDto } from 'src/billings/dto/update-billing-info.dto';
import { CreateInvoiceDto } from 'src/billings/dto/create-invoice.dto';
import { CreatePaymentDto } from 'src/payments/dto/create-payment.dto';

import { PaymentAttemptStatus } from 'src/payments/enums/payment-attempt-status.enum';
import { SubscriptionStatus } from 'src/subscriptions/enums/subscription-status.enum';
import { PaymentStatus } from 'src/payments/enums/payment-status.enum';
import { InvoiceStatus } from 'src/billings/enums/invoice-status.enum';
import { InvoiceType } from 'src/billings/enums/invoice-type.enum';

import Stripe from 'stripe';

@Injectable()
export class WebhooksService {
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
      throw new Error('Webhook key not defined in environment variables');
    }

    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const fullName = session.customer_details?.name;
        const paymentIntentId = session.payment_intent;

        if (!userId) {
          throw new Error('userId not defined in stripe session metadata');
        }

        const updateData: UpdateBillingInfoDto = {};

        if (fullName) {
          updateData.fullName = fullName;
        }

        if (session.currency) {
          updateData.currency = session.currency;
        }

        if (Object.keys(updateData).length > 0) {
          await this.billingsService.updateBillingInfo(userId, updateData);
        }

        if (paymentIntentId) {
          await this.paymentsService.updatePaymentAttemptBySessionId(
            session.id,
            {
              status: PaymentAttemptStatus.PROCESSING,
              stripePaymentIntentId: paymentIntentId as string,
            },
          );
        } else {
          await this.paymentsService.updatePaymentAttemptBySessionId(
            session.id,
            {
              status: PaymentAttemptStatus.PROCESSING,
            },
          );
        }
        return;
      }

      case 'checkout.session.expired':
        const sessionId = event.data.object.id;

        await this.paymentsService.updatePaymentAttemptBySessionId(sessionId, {
          status: PaymentAttemptStatus.CANCELLED,
        });

        return;

      case 'customer.subscription.created':
        const stripeSubscription = event.data.object;
        const customerId = stripeSubscription.customer as string;

        const priceId = stripeSubscription.items.data[0].price.id;
        const plan = await this.plansService.findByStripePriceId(priceId);

        const billingInfo =
          await this.billingsService.findBillingInfoByCustomerId(customerId);

        await this.subscriptionsService.subscribe({
          userId: billingInfo.userId,
          planName: plan.name,
          startAt: new Date(
            (stripeSubscription as any).current_period_start * 1000,
          ),
          currentPeriodEnd: new Date(
            (stripeSubscription as any).current_period_end * 1000,
          ),
          stripeSubscriptionId: stripeSubscription.id,
        });

        return;

      case 'customer.subscription.deleted':
        const subscriptionId = (event.data.object as Stripe.Subscription).id;

        await this.subscriptionsService.updateSubscription(subscriptionId, {
          status: SubscriptionStatus.CANCELLED,
        });

        return;

      case 'invoice.created': {
        const stripeInvoice = event.data.object as Stripe.Invoice;

        if (!stripeInvoice.id) {
          throw new Error('Stripe invoice ID is missing');
        }

        const billingInfo =
          await this.billingsService.findBillingInfoByCustomerId(
            stripeInvoice.customer as string,
          );

        if (!billingInfo.user) {
          throw new Error('User not found in billingInfo');
        }

        // Criar o invoice
        const createInvoiceDto: CreateInvoiceDto = {
          userId: billingInfo.user.id,
          billingInfoId: billingInfo.id,
          subscriptionId: (stripeInvoice as any).subscription
            ? ((stripeInvoice as any).subscription as string)
            : undefined,
          type: InvoiceType.SUBSCRIPTION,
          amount: stripeInvoice.amount_due / 100,
          currency: stripeInvoice.currency.toUpperCase(),
          stripeInvoiceId: stripeInvoice.id, // Agora TypeScript sabe que não é undefined
          description: stripeInvoice.description || undefined,
        };

        const createdInvoiceDto =
          await this.billingsService.createInvoice(createInvoiceDto);

        // Atualizar PaymentAttempt com as informações do PaymentIntent e relacionar com o invoice
        const paymentIntentId = (stripeInvoice as any).payment_intent as string;

        if (paymentIntentId) {
          // Buscar a invoice completa para poder relacionar
          const fullInvoice = await this.billingsService.findInvoiceByStripeId(
            stripeInvoice.id,
          ); // Agora não dá erro

          if (fullInvoice) {
            await this.paymentsService.updatePaymentAttemptByPaymentIntentId(
              paymentIntentId,
              {
                invoice: fullInvoice,
                amount: stripeInvoice.amount_due / 100,
                currency: stripeInvoice.currency.toUpperCase(),
              },
            );
          }
        }

        return;
      }

      case 'invoice.payment_succeeded': {
        const stripeInvoice = event.data.object as Stripe.Invoice;

        // Verificar se stripeInvoice.id existe
        if (!stripeInvoice.id) {
          throw new Error('Stripe invoice ID is missing');
        }

        // 1. Buscar o invoice pelo stripeInvoiceId
        const invoice = await this.billingsService.findInvoiceByStripeId(
          stripeInvoice.id,
        );

        if (!invoice) {
          throw new Error(
            `Invoice not found for Stripe invoice: ${stripeInvoice.id}`,
          );
        }

        // 2. Buscar o paymentAttempt pelo stripePaymentIntentId
        const paymentIntentId = (stripeInvoice as any).payment_intent as string;

        if (!paymentIntentId) {
          throw new Error('Payment intent ID is missing from invoice');
        }

        const paymentAttempt =
          await this.paymentsService.findPaymentAttemptByPaymentIntentId(
            paymentIntentId,
          );

        if (!paymentAttempt) {
          throw new Error(
            `PaymentAttempt not found for payment intent: ${paymentIntentId}`,
          );
        }

        // 3. Atualizar status do paymentAttempt para SUCCEEDED
        const chargeId = (stripeInvoice as any).charge as string;

        await this.paymentsService.updatePaymentAttemptById(paymentAttempt.id, {
          status: PaymentAttemptStatus.SUCCEEDED,
          ...(chargeId && { stripeChargeId: chargeId }),
        });

        // 4. Criar o Payment
        const createPaymentDto: CreatePaymentDto = {
          invoiceId: invoice.id,
          originAttemptId: paymentAttempt.id,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: chargeId,
          amount: stripeInvoice.amount_paid / 100,
          currency: stripeInvoice.currency?.toUpperCase() || 'BRL',
          status: PaymentStatus.SUCCEEDED,
        };

        await this.paymentsService.createPayment(createPaymentDto);

        // 5. Atualizar status do invoice para PAID
        await this.billingsService.updateInvoiceStatus(
          invoice.id,
          InvoiceStatus.COMPLETED,
        );

        return;
      }

      default:
        // Ignora eventos não tratados (não é erro)
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
}
