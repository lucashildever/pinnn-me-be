import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { BillingInfo } from 'src/billings/entities/billing-info.entity';
import { UserEntity } from 'src/users/entities/user.entity';

import { PaymentPeriod } from './enums/payment-period.enum';

import Stripe from 'stripe';
import { CheckoutSessionResponseDto } from './dto/checkout-session-response.dto';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(BillingInfo)
    private readonly billingInfoRepository: Repository<BillingInfo>,
  ) {
    const stripeSecretKey = this.configService.get<string>('stripe.secretKey');

    if (!stripeSecretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is required but not defined in environment variables',
      );
    }

    this.stripe = new Stripe(stripeSecretKey);
  }

  async createCheckoutSession(
    userId: string,
    planType: 'pro',
    period: PaymentPeriod,
  ): Promise<CheckoutSessionResponseDto> {
    try {
      const customer = await this.getOrCreateStripeCustomer(userId);
      const priceId = this.getPriceIdByPlan(planType, period);

      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        ui_mode: 'embedded',
        redirect_on_completion: 'never',
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId: userId,
          planType: planType,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      });

      return {
        sessionId: session.id,
        clientSecret: session.client_secret,
      };
    } catch (error) {
      throw new BadRequestException(
        `Error while trying to create checkout session: ${error.message}`,
      );
    }
  }

  async getSessionStatus(sessionId: string, userId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      if (session.metadata?.userId !== userId) {
        // security check
        throw new UnauthorizedException('Sessão não pertence ao usuário');
      }

      return {
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email,
        amount_total: session.amount_total,
        currency: session.currency,
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao buscar status da sessão: ${error.message}`,
      );
    }
  }

  // Criar portal do cliente
  async createCustomerPortal(userId: string, returnUrl: string) {
    try {
      const customer = await this.getCustomerByUserId(userId);

      if (!customer) {
        throw new NotFoundException('Cliente não encontrado');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: returnUrl,
      });

      return {
        url: session.url,
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao criar portal do cliente: ${error.message}`,
      );
    }
  }

  // Obter status da assinatura
  async getSubscriptionStatus(userId: string) {
    try {
      const customer = await this.getCustomerByUserId(userId);

      if (!customer) {
        return {
          hasActiveSubscription: false,
          plan: 'free',
          status: null,
        };
      }

      const subscriptions = await this.stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 1,
      });

      const activeSubscription = subscriptions.data.find((sub) =>
        ['active', 'trialing'].includes(sub.status),
      );

      return {
        hasActiveSubscription: !!activeSubscription,
        plan: activeSubscription ? 'premium' : 'free',
        status: activeSubscription?.status || null,
        // currentPeriodEnd: activeSubscription?.currentPeriodEnd
        //   ? new Date(activeSubscription.current_period_end * 1000)
        //   : null,
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao obter status da assinatura: ${error.message}`,
      );
    }
  }

  // Cancelar assinatura
  async cancelSubscription(userId: string) {
    try {
      const customer = await this.getCustomerByUserId(userId);

      if (!customer) {
        throw new NotFoundException('Cliente não encontrado');
      }

      const subscriptions = await this.stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        throw new NotFoundException('Assinatura ativa não encontrada');
      }

      const subscription = subscriptions.data[0];

      // Cancelar no final do período atual
      const updatedSubscription = await this.stripe.subscriptions.update(
        subscription.id,
        {
          cancel_at_period_end: true,
        },
      );

      return {
        message: 'Assinatura será cancelada no final do período atual',
        //cancelAt: new Date(updatedSubscription.current_period_end * 1000),
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao cancelar assinatura: ${error.message}`,
      );
    }
  }

  // Reativar assinatura
  async reactivateSubscription(userId: string) {
    try {
      const customer = await this.getCustomerByUserId(userId);

      if (!customer) {
        throw new NotFoundException('Cliente não encontrado');
      }

      const subscriptions = await this.stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 1,
      });

      const subscription = subscriptions.data.find(
        (sub) => sub.cancel_at_period_end === true,
      );

      if (!subscription) {
        throw new NotFoundException('Assinatura cancelada não encontrada');
      }

      const updatedSubscription = await this.stripe.subscriptions.update(
        subscription.id,
        {
          cancel_at_period_end: false,
        },
      );

      return {
        message: 'Assinatura reativada com sucesso',
        status: updatedSubscription.status,
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao reativar assinatura: ${error.message}`,
      );
    }
  }

  // Obter faturas do cliente
  async getCustomerInvoices(userId: string) {
    try {
      const customer = await this.getCustomerByUserId(userId);

      if (!customer) {
        return [];
      }

      const invoices = await this.stripe.invoices.list({
        customer: customer.id,
        limit: 10,
      });

      return invoices.data.map((invoice) => ({
        id: invoice.id,
        amount: invoice.amount_paid / 100, // Converter de centavos
        currency: invoice.currency,
        status: invoice.status,
        created: new Date(invoice.created * 1000),
        pdfUrl: invoice.invoice_pdf,
      }));
    } catch (error) {
      throw new BadRequestException(`Erro ao obter faturas: ${error.message}`);
    }
  }

  // Private helpers
  private async getOrCreateStripeCustomer(
    userId: string,
  ): Promise<Stripe.Customer> {
    const { email } = await this.usersRepository.findOneOrFail({
      select: { email: true },
      where: { id: userId },
    });

    const billingInfo = await this.billingInfoRepository.findOneOrFail({
      select: { stripeCustomerId: true, fullName: true },
      where: { userId },
    });

    if (billingInfo.stripeCustomerId) {
      try {
        const customerFromStripe = await this.stripe.customers.retrieve(
          billingInfo.stripeCustomerId,
        );

        if (customerFromStripe.deleted) {
          await this.billingInfoRepository.update(
            { userId },
            { stripeCustomerId: undefined },
          );
        } else {
          return customerFromStripe as Stripe.Customer;
        }
      } catch (error) {
        if (error.type === 'StripeInvalidRequestError') {
          await this.billingInfoRepository.update(
            { userId },
            { stripeCustomerId: undefined },
          );
        } else {
          throw error;
        }
      }
    }

    const existingStripeCustomer = await this.findExistingStripeCustomer(
      email,
      userId,
    );

    if (existingStripeCustomer) {
      await this.saveBillingInfo(userId, existingStripeCustomer.id);
      return existingStripeCustomer;
    }

    const customer = await this.createStripeCustomer(
      billingInfo.fullName,
      email,
      userId,
    );

    await this.saveBillingInfo(userId, customer.id);

    return customer;
  }

  private async findExistingStripeCustomer(
    email: string,
    userId: string,
  ): Promise<Stripe.Customer | null> {
    try {
      const customers = await this.stripe.customers.list({ email, limit: 1 });

      const customer = customers.data[0];

      if (!customer) {
        return null;
      }

      if (customer.metadata?.userId === userId) {
        return customer;
      }

      return null;
    } catch (error) {
      if (
        error.type === 'StripeConnectionError' ||
        error.type === 'StripeAPIError'
      ) {
        throw error;
      }

      return null;
    }
  }

  private async createStripeCustomer(
    name: string,
    email: string,
    userId: string,
  ): Promise<Stripe.Customer> {
    const idempotencyKey = `create-customer-user-${userId}`;

    try {
      return await this.stripe.customers.create(
        {
          email: email,
          name: name,
          metadata: { userId },
        },
        { idempotencyKey },
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while trying to create Stripe customer',
      );
    }
  }

  private async saveBillingInfo(
    userId: string,
    customerId: string,
  ): Promise<void> {
    try {
      const result = await this.billingInfoRepository.update(
        { userId },
        { stripeCustomerId: customerId },
      );

      if (result.affected === 0) {
        await this.billingInfoRepository.save({
          userId,
          stripeCustomerId: customerId,
        });
      }
    } catch (error) {
      // Don't perform a Stripe rollback if it can't register the stripeCustomerId in the local DB.
      // The next execution of findExistingStripeCustomer will automatically synchronize it.
      throw new InternalServerErrorException(
        'Error while trying to save billing info',
      );
    }
  }

  ////
  private async getCustomerByUserId(
    userId: string,
  ): Promise<Stripe.Customer | null> {
    // TODO: Implementar busca do customer ID no banco
    // const user = await this.usersService.findById(userId);
    // if (!user.stripeCustomerId) return null;
    // return await this.stripe.customers.retrieve(user.stripeCustomerId);

    // Por enquanto, buscar por email (temporário)
    const userEmail = `user-${userId}@example.com`;
    const customers = await this.stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    return customers.data.length > 0 ? customers.data[0] : null;
  }

  private getPriceIdByPlan(planType: 'pro', period: PaymentPeriod) {
    const priceIds = {
      pro: this.configService.get<string>(`stripe.prices.pro.${period}`),
      // Add more prices/plans here
    };

    return priceIds[planType];
  }

  // Método para ser usado pelo webhook
  async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const customer = await this.stripe.customers.retrieve(customerId);

    if (customer.deleted) return;

    const userId = customer.metadata?.userId;

    if (userId) {
      // TODO: Registrar no billings service
      // await this.billingsService.createSubscriptionRecord({
      //   userId,
      //   stripeSubscriptionId: subscription.id,
      //   planType: 'premium',
      //   status: subscription.status,
      //   currentPeriodStart: new Date(subscription.current_period_start * 1000),
      //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      // });
    }
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // TODO: Atualizar registro no billings service
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // TODO: Marcar assinatura como cancelada no billings service
  }

  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    // TODO: Registrar pagamento no billings service
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // TODO: Registrar falha no pagamento no billings service
  }
}
