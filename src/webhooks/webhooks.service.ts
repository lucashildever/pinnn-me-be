import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PaymentsService } from '../payments/payments.service';
import { BillingsService } from 'src/billings/billings.service';
import { PlansService } from 'src/plans/plans.service';

import { PaymentAttemptStatus } from 'src/payments/enums/payment-attempt-status.enum';

import Stripe from 'stripe';
import { PlanType } from 'src/plans/enums/plan-type.enum';
import { SubscriptionStatus } from 'src/subscriptions/enums/subscription-status.enum';

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
      case 'checkout.session.completed':
        // sessão finalizada com sucesso
        // (ações de ux e comunicação)

        // - enviar email de confirmação de assinatura ✅
        // - algo de analytics pode vir aqui ✅

        // [x] atualizar o paymentAttempt para PROCESSING ✅

        await this.paymentsService.updatePaymentAttemptStatus(
          event.data.object.id,
          PaymentAttemptStatus.PROCESSING,
        );

        return;

      case 'checkout.session.expired':
        // expirou por tempo limite. razões: inatividade, abandono...
        // ação automática do stripe

        // - Marcar lead como "checkout_abandonado"
        // - Disparar email de recuperação após algumas horas (remarketing)
        // - Analytics para identificar pontos de abandono no funil

        // [X] atualizar o paymentAttempt para CANCELLED ✅

        await this.paymentsService.updatePaymentAttemptStatus(
          event.data.object.id,
          PaymentAttemptStatus.CANCELLED,
        );

        return;

      case 'customer.subscription.created':
        // "Subscription criada APÓS pagamento confirmado no checkout"
        // "Este evento só dispara quando o pagamento foi processado com sucesso"

        const stripeSubscription = event.data.object;

        const billingInfo =
          await this.billingsService.findBillingInfoByCustomerId(
            stripeSubscription.customer as string,
          );

        const userId = billingInfo.userId;

        const priceId = stripeSubscription.items.data[0].price.id;
        const plan = await this.plansService.findByStripePriceId(priceId);

        await this.subscriptionsService.subscribe({
          userId: userId,
          planName: plan.name,
          startAt: new Date(
            (stripeSubscription as any).current_period_start * 1000,
          ),
          currentPeriodEnd: new Date(
            (stripeSubscription as any).current_period_end * 1000,
          ),
          billingProviderId: stripeSubscription.id,
        });

        return;

      case 'customer.subscription.deleted':
        // inscrição deletada manualmente via api ou dashboard stripe,
        // ou inscrição deletada no fim do período atual (cancel_at_period_end = true)

        const pausedSubscription = event.data.object as Stripe.Subscription;

        await this.subscriptionsService.updateSubscription(
          pausedSubscription.id,
          {
            status: SubscriptionStatus.CANCELLED,
          },
        );

        return;

      case 'invoice.payment_succeeded':
        // pagamento confirmado pela stripe
        // - atualizar o paymentAttempt para SUCCEEDED ✅
        // - gerar registro no Payment (entidade) com status SUCCEEDED ✅
        // - atualizar o status do invoice para COMPLETED ✅

        const invoice = event.data.object as Stripe.Invoice;

        if (!invoice.id) {
          throw new Error('Missing invoice ID in payment_succeeded webhook');
        }

        await this.paymentsService.updatePaymentAttemptStatus(
          invoice.id,
          PaymentAttemptStatus.SUCCEEDED,
        );

        return;

      case 'invoice.payment_failed':
        // pagamento não confirmado pela stripe por algum motivo (cartão expirou, falha no banco etc)
        // - revogar acesso ao pró no Subscriptions ✅
        // - atualizar o PaymentAttemptStatus para FAILED ✅

        return;

      default:
        // Ignora eventos não tratados (não é erro)
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
}
