import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private paymentsService: PaymentsService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is required but not defined in environment variables',
      );
    }

    this.stripe = new Stripe(stripeSecretKey);
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      const webhookKey = this.configService.get<string>('stripe.webhookKey');

      if (!webhookKey) {
        throw new Error('webhook key not configured in environment variables');
      }
      // Verificar assinatura do webhook
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookKey,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new BadRequestException(`Webhook signature verification failed`);
    }

    this.logger.log(`Received Stripe webhook: ${event.type}`);

    try {
      // Processar diferentes tipos de eventos do Stripe
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
          );
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

        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'customer.created':
          await this.handleCustomerCreated(
            event.data.object as Stripe.Customer,
          );
          break;

        case 'customer.updated':
          await this.handleCustomerUpdated(
            event.data.object as Stripe.Customer,
          );
          break;

        default:
          this.logger.warn(
            `Unhandled Stripe webhook event type: ${event.type}`,
          );
      }

      // Log do evento processado
      await this.logWebhookEvent('stripe', event.type, event.id, 'success');

      return { received: true, processed: true };
    } catch (error) {
      this.logger.error(
        `Error processing Stripe webhook ${event.type}:`,
        error,
      );

      // Log do erro
      await this.logWebhookEvent(
        'stripe',
        event.type,
        event.id,
        'failed',
        error.message,
      );

      throw new BadRequestException(
        `Failed to process webhook: ${error.message}`,
      );
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription created: ${subscription.id}`);
    await this.paymentsService.handleSubscriptionCreated(subscription);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription deleted: ${subscription.id}`);
    await this.paymentsService.handleSubscriptionDeleted(subscription);
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);
    await this.paymentsService.handleInvoicePaymentSucceeded(invoice);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    this.logger.log(`Invoice payment failed: ${invoice.id}`);
    await this.paymentsService.handleInvoicePaymentFailed(invoice);
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    this.logger.log(`Checkout session completed: ${session.id}`);

    // Se for modo subscription, a assinatura será criada automaticamente
    // e o evento customer.subscription.created será disparado
    if (session.mode === 'subscription') {
      this.logger.log(
        'Subscription checkout completed, waiting for subscription.created event',
      );
    }

    // TODO: Se precisar fazer algo específico quando o checkout é completado
  }

  private async handleCustomerCreated(customer: Stripe.Customer) {
    this.logger.log(`Customer created: ${customer.id}`);
    // TODO: Sincronizar com banco de dados local se necessário
  }

  private async handleCustomerUpdated(customer: Stripe.Customer) {
    this.logger.log(`Customer updated: ${customer.id}`);
    // TODO: Sincronizar atualizações com banco de dados local se necessário
  }

  // Método para log de eventos de webhook
  private async logWebhookEvent(
    source: string,
    eventType: string,
    eventId: string,
    status: 'success' | 'failed',
    errorMessage?: string,
  ) {
    // TODO: Salvar no banco de dados para auditoria
    this.logger.log(
      `Webhook log: ${source} - ${eventType} - ${eventId} - ${status}${
        errorMessage ? ` - ${errorMessage}` : ''
      }`,
    );

    // Exemplo de como você pode estruturar o log no banco:
    // await this.webhookLogsService.create({
    //   source,
    //   eventType,
    //   eventId,
    //   status,
    //   errorMessage,
    //   processedAt: new Date(),
    // });
  }
}
