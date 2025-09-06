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
        break;
      }
      case 'checkout.session.expired': {
        const sessionId = event.data.object.id;

        await this.paymentsService.updatePaymentAttemptBySessionId(sessionId, {
          status: PaymentAttemptStatus.CANCELLED,
        });

        break;
      }
      case 'customer.subscription.created': {
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

        break;
      }
      case 'customer.subscription.deleted': {
        const subscriptionId = (event.data.object as Stripe.Subscription).id;

        await this.subscriptionsService.updateSubscription(subscriptionId, {
          status: SubscriptionStatus.CANCELLED,
        });

        break;
      }
      // verificar qual a situação em que o usuario deixa de pagar ou falha, e eu ainda assim
      // não bloqueio imediatamente
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const previousAttributes = event.data.previous_attributes;
        const currentStatus = subscription.status;
        const prevStatus = previousAttributes?.status;

        const statusChanged = prevStatus && prevStatus !== currentStatus;

        if (statusChanged) {
          console.log(
            `Status change detected: ${prevStatus} → ${currentStatus}`,
          );

          const skipConditions = [
            currentStatus === 'canceled', // Handled in customer.subscription.deleted
            currentStatus === 'paused', // Handled in customer.subscription.paused
            currentStatus === 'active' && prevStatus === 'paused', // Handled in customer.subscription.resumed
          ];

          if (skipConditions.some((condition) => condition)) break;

          // TODO - liberação de acesso deve ser feita em eventos
          // de confirmação de pagamento
          const accessGrantingTransitions = {
            trialing: {
              active: () => {
                // handleTrialToProPaid(subscription)
                // - Atualizar banco de dados: user.subscription_status = 'pro_paid'
                // - Enviar email de conversão
                // - Ativar recursos Pro completos
                // - Analytics: track conversion
              },
            },
            past_due: {
              active: () => {
                // handleRestoreProAccess(subscription)
                // - Restaurar acesso completo aos recursos Pro
                // - Atualizar banco de dados: user.subscription_status = 'pro_active'
                // - Enviar email de confirmação de pagamento
                // - Remover limitações de uso
              },
            },
          };

          const accessBlockingTransitions = {
            active: {
              unpaid: () => {
                // handleBlockAccessImmediately(subscription, 'unpaid')
                // - Bloquear acesso aos recursos Pro imediatamente
                // - Atualizar banco de dados: user.subscription_status = 'blocked'
                // - Enviar notificação sobre bloqueio
                // - Redirecionar para página de pagamento se aplicável
              },
            },
            trialing: {
              incomplete_expired: () => {
                // handleBlockAccessImmediately(subscription, 'trial_expired')
                // - Bloquear acesso aos recursos Pro imediatamente
                // - Atualizar banco de dados: user.subscription_status = 'blocked'
                // - Enviar notificação sobre bloqueio (trial expirado)
                // - Redirecionar para página de upgrade/pagamento
              },
            },
          };

          await executeTransition(
            accessGrantingTransitions,
            prevStatus,
            currentStatus,
            subscription,
          );

          await executeTransition(
            accessBlockingTransitions,
            prevStatus,
            currentStatus,
            subscription,
          );
        }

        // current_period_end
        if (previousAttributes?.items?.data?.[0]?.current_period_end) {
          const oldPeriodEnd = new Date(
            previousAttributes.items.data[0].current_period_end * 1000,
          );
          const newPeriodEnd = new Date(
            subscription.items.data[0].current_period_end * 1000,
          );

          if (oldPeriodEnd.getTime() !== newPeriodEnd.getTime()) {
            // handleRenewalCalendarUpdate(subscription, oldPeriodEnd, newPeriodEnd)
            // - Atualizar calendario de renovação no banco de dados
            // - Atualizar lembretes de cobrança
            // - Notificar usuário sobre mudança de data
          }
        }

        // trial_end
        if (previousAttributes?.trial_end !== undefined) {
          const oldTrialEnd = previousAttributes.trial_end;
          const newTrialEnd = subscription.trial_end;

          if (oldTrialEnd !== newTrialEnd) {
            // handleTrialEndChange(subscription, oldTrialEnd, newTrialEnd)
            // - Gerenciar extensão ou redução de trial
            // - Atualizar notificações de fim de trial
            // - Ajustar onboarding timeline
          }
        }

        // cancel_at_period_end
        if (previousAttributes?.cancel_at_period_end !== undefined) {
          const oldCancelAtPeriodEnd = previousAttributes.cancel_at_period_end;
          const newCancelAtPeriodEnd = subscription.cancel_at_period_end;

          if (oldCancelAtPeriodEnd === false && newCancelAtPeriodEnd === true) {
            // handleScheduleFutureBlock(subscription)
            // - Agendar bloqueio para subscription.current_period_end
            // - Criar job/task para executar bloqueio
            // - Enviar email confirmando cancelamento agendado
            // - Mostrar período restante na UI
          } else if (
            oldCancelAtPeriodEnd === true &&
            newCancelAtPeriodEnd === false
          ) {
            // handleCancelScheduledBlock(subscription)
            // - Cancelar job/task de bloqueio agendado
            // - Restaurar subscription normal
            // - Enviar email confirmando cancelamento do cancelamento
            // - Atualizar UI removendo avisos de cancelamento
          }
        }

        async function executeTransition(
          transitions: any,
          prevStatus: string | null,
          currentStatus: string,
          subscription: Stripe.Subscription,
        ) {
          const prevStatusKey = prevStatus ?? 'undefined';
          const fromTransitions = transitions[prevStatusKey];

          if (!fromTransitions) return; // No transition mapped for this previous state

          const transitionHandler = fromTransitions[currentStatus];

          if (!transitionHandler) return; // No transition mapped for current state

          try {
            await transitionHandler();
          } catch (error) {
            console.error(
              `❌ Erro na transição ${prevStatusKey} → ${currentStatus}:`,
              error,
            );
            // logTransitionError(subscription, prevStatusKey, currentStatus, error)
            // - Enviar erro para sistema de monitoramento (Sentry, etc)
            // - Criar ticket de suporte se necessário
            // - Alertar equipe de desenvolvimento
            // - Registrar detalhes do erro: subscriptionId, customerId, transition, error, timestamp
          }
        }

        break;
      }

      case 'invoice.created': {
        const stripeInvoice = event.data.object as Stripe.Invoice;
        const customerId = stripeInvoice.customer as string;

        if (!stripeInvoice.id) {
          throw new Error('Stripe invoice ID is missing');
        }

        const billingInfo =
          await this.billingsService.findBillingInfoByCustomerId(customerId);

        if (!billingInfo.user) {
          throw new Error('User not found in billingInfo');
        }

        const createInvoiceDto: CreateInvoiceDto = {
          userId: billingInfo.user.id,
          billingInfoId: billingInfo.id,
          subscriptionId: (stripeInvoice as any).subscription
            ? ((stripeInvoice as any).subscription as string)
            : undefined,
          type: InvoiceType.SUBSCRIPTION,
          amount: stripeInvoice.amount_due / 100,
          currency: stripeInvoice.currency.toUpperCase(),
          stripeInvoiceId: stripeInvoice.id,
          description: stripeInvoice.description || undefined,
        };

        await this.billingsService.createInvoice(createInvoiceDto);

        const paymentIntentId = (stripeInvoice as any).payment_intent as string;

        if (paymentIntentId) {
          const fullInvoice =
            await this.billingsService.findInvoiceInstanceById(
              stripeInvoice.id,
            );

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

        break;
      }
      case 'invoice.payment_succeeded': {
        const stripeInvoice = event.data.object as Stripe.Invoice;

        if (!stripeInvoice.id) {
          throw new Error('Stripe invoice ID is missing');
        }

        const invoice = await this.billingsService.findInvoiceInstanceById(
          stripeInvoice.id,
        );

        if (!invoice) {
          throw new Error(
            `Invoice not found for Stripe invoice: ${stripeInvoice.id}`,
          );
        }

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

        const chargeId = (stripeInvoice as any).charge as string;

        await this.paymentsService.updatePaymentAttemptById(paymentAttempt.id, {
          status: PaymentAttemptStatus.SUCCEEDED,
          ...(chargeId && { stripeChargeId: chargeId }),
        });

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

        await this.billingsService.updateInvoiceStatus(
          invoice.id,
          InvoiceStatus.COMPLETED,
        );

        break;
      }
      case 'invoice.payment_failed': {
        const stripeInvoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (stripeInvoice as any).subscription as string;

        if (subscriptionId) {
          await this.subscriptionsService.updateSubscription(subscriptionId, {
            status: SubscriptionStatus.CANCELLED,
          });
        }

        const paymentIntentId = (stripeInvoice as any).payment_intent as string;

        if (paymentIntentId) {
          await this.paymentsService.updatePaymentAttemptByPaymentIntentId(
            paymentIntentId,
            {
              status: PaymentAttemptStatus.FAILED,
            },
          );
        }

        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
}
