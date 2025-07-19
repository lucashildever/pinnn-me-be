// src/payments/payments.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    // Inject do BillingsService para registrar transações
    // private billingsService: BillingsService,
    // Inject do UsersService para buscar/atualizar dados do usuário
    // private usersService: UsersService,
  ) {
    const stripeSecretKey = this.configService.get<string>('stripe.secretKey');

    if (!stripeSecretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is required but not defined in environment variables',
      );
    }

    this.stripe = new Stripe(stripeSecretKey);
  }

  // Criar sessão de checkout
  async createCheckoutSession(
    userId: string,
    planType: 'premium',
    successUrl: string,
    cancelUrl: string,
  ) {
    try {
      // Buscar ou criar customer no Stripe
      const customer = await this.getOrCreateCustomer(userId);

      // Definir price ID baseado no plano (você deve criar esses produtos no dashboard do Stripe)
      const priceId = this.getPriceIdByPlan(planType);

      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
          planType: planType,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao criar sessão de checkout: ${error.message}`,
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

  // Métodos auxiliares privados
  private async getOrCreateCustomer(userId: string): Promise<Stripe.Customer> {
    // TODO: Implementar busca do usuário no banco
    // const user = await this.usersService.findById(userId);
    // Mockup - (você deve implementar a busca real)
    const userEmail = `user-${userId}@example.com`;

    // Verificar se já existe customer
    const existingCustomers = await this.stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Criar novo customer
    const customer = await this.stripe.customers.create({
      email: userEmail,
      metadata: {
        userId: userId,
      },
    });

    // TODO: Salvar customer ID no banco de dados do usuário
    // await this.usersService.updateStripeCustomerId(userId, customer.id);

    return customer;
  }

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

  // private getPriceIdByPlan(planType: 'premium'): string {
  private getPriceIdByPlan(planType: 'premium') {
    // TODO: Configurar no .env ou banco de dados
    const priceIds = {
      premium: this.configService.get<string>('STRIPE_PREMIUM_PRICE_ID'),
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
