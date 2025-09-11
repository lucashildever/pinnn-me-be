import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, UpdateResult } from 'typeorm';

import { PaymentPeriod } from './enums/payment-period.enum';

import { BillingsService } from 'src/billings/billings.service';
import { UsersService } from 'src/users/users.service';

import { ReactivateStripeSubscriptionResponseDto } from './dto/reactivate-stripe-subscription-response.dto';
import { CheckoutSessionResponseDto } from './dto/checkout-session-response.dto';
import { SessionStatusDto } from './dto/session-status.dto';
import { StripeInvoiceDto } from './dto/stripe-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

import { PaymentAttempt } from './entities/payment-attempt.entity';
import { Payment } from './entities/payment.entity';

import Stripe from 'stripe';
import { CreateBillingInfoDto } from 'src/billings/dto/create-billing-info.dto';
import { CreatePaymentAttemptDto } from './dto/create-payment-attempt.dto';
import { PaymentAttemptStatus } from './enums/payment-attempt-status.enum';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly billingsService: BillingsService,
    private readonly usersService: UsersService,

    @InjectRepository(PaymentAttempt)
    private readonly paymentAttemptRepository: Repository<PaymentAttempt>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    @Inject('STRIPE') private stripe: Stripe,
  ) {}

  async createCheckoutSession(
    userId: string,
    planType: 'pro',
    period: PaymentPeriod,
  ): Promise<CheckoutSessionResponseDto> {
    try {
      // se eu crio o customer stripe via api antes de direcionar para
      // a página de checkout, esta parte é desnecessária.
      // TODO - atualizar isso e garantir q o customer exista antes de chegar nesta etapa
      const customer = await this.findOrCreateStripeCustomer(userId);
      const priceId = this.getPriceIdByPlan(planType, period);

      if (!priceId) {
        throw new Error('price id not found');
      }

      const paymentAttempt = await this.createPaymentAttempt({
        // status is set to PENDING by default in entity, no need to set it here
        metadata: {
          userId: userId,
          // esses dados abaixo são necessários? verificar
          planType: planType,
          period: period,
        },
      });

      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        ui_mode: 'embedded',
        redirect_on_completion: 'never',
        mode: 'subscription',
        line_items: [
          {
            // verificar se isso esta certo
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId: userId,
          planType: planType,
          paymentAttemptId: paymentAttempt.id,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      });

      const priceInfo = await this.stripe.prices.retrieve(priceId);

      paymentAttempt.stripeSessionId = session.id;
      // Verificar se isso está certo ou se eu preciso verificar currency_options
      // (validar currency usada pelo usuario) - melhor fazer o session.retrieve?
      paymentAttempt.amount = priceInfo.unit_amount ?? undefined;
      paymentAttempt.currency = priceInfo.currency;

      await this.paymentAttemptRepository.save(paymentAttempt);

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

  async findSessionStatus(
    sessionId: string,
    userId: string,
  ): Promise<SessionStatusDto> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      // security check
      if (session.metadata?.userId !== userId) {
        throw new UnauthorizedException(
          "This session doesn't belongs to this user!",
        );
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
        `Error while trying to get session status: ${error.message}`,
      );
    }
  }

  async createStripeCustomer(
    userId: string,
    email: string,
    name?: string,
  ): Promise<Stripe.Customer> {
    const idempotencyKey = `create-customer-user-${userId}`;
    try {
      const customerData: Stripe.CustomerCreateParams = {
        email: email,
        metadata: { userId },
      };

      if (name) {
        customerData.name = name;
      }

      const stripeCustomer = await this.stripe.customers.create(customerData, {
        idempotencyKey,
      });

      const createBillingInfoDto: CreateBillingInfoDto = {
        stripeCustomerId: stripeCustomer.id,
        name: name,
      };

      await this.billingsService.createBillingInfo(
        userId,
        createBillingInfoDto,
      );

      return stripeCustomer;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while trying to create Stripe customer',
      );
    }
  }

  async createCustomerPortal(
    userId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    try {
      const customer = await this.findCustomerByUserId(userId);

      if (!customer) {
        throw new NotFoundException('Customer not found!');
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
        `Error while trying to create customer portal: ${error.message}`,
      );
    }
  }

  async cancelStripeSubscription(
    stripeSubscriptionId: string,
  ): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async reactivateStripeSubscription(
    userId: string,
  ): Promise<ReactivateStripeSubscriptionResponseDto> {
    try {
      const customer = await this.findCustomerByUserId(userId);

      if (!customer) {
        throw new NotFoundException('Stripe customer not found!');
      }

      const subscriptionsResponse = await this.stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 1,
      });

      const subscription = subscriptionsResponse.data.find(
        (sub) => sub.cancel_at_period_end === true,
      );

      if (!subscription) {
        throw new NotFoundException('Canceled subscription not found!');
      }

      const updatedSubscription = await this.stripe.subscriptions.update(
        subscription.id,
        {
          cancel_at_period_end: false,
        },
      );

      return {
        message: 'Subscription reactivated successfully',
        status: updatedSubscription.status,
      };
    } catch (error) {
      throw new BadRequestException(
        `Error while trying to reactivate subscription: ${error.message}`,
      );
    }
  }

  async findStripeCustomerInvoices(
    userId: string,
  ): Promise<StripeInvoiceDto[]> {
    try {
      const customer = await this.findCustomerByUserId(userId);

      if (!customer) {
        return [];
      }

      const invoices = await this.stripe.invoices.list({
        customer: customer.id,
        limit: 10,
      });

      return invoices.data.map(
        (invoice): StripeInvoiceDto => ({
          id: invoice.id,
          amount: invoice.amount_paid / 100, // Stripe store values in cents
          currency: invoice.currency,
          status: invoice.status,
          created: new Date(invoice.created * 1000),
          pdfUrl: invoice.invoice_pdf,
        }),
      );
    } catch (error) {
      throw new BadRequestException(
        `Error while trying to get invoices: ${error.message}`,
      );
    }
  }

  // Ao atualizar ambas as funções, verificar onde elas são chamadas
  // pois já que elas agora tratam erros, o seu uso pode não precisar de verificação
  async updatePaymentAttemptBySessionId(
    sessionId: string,
    updateData: Partial<PaymentAttempt>,
  ): Promise<UpdateResult> {
    try {
      const result = await this.paymentAttemptRepository.update(
        { stripeSessionId: sessionId },
        updateData,
      );

      if (result.affected === 0) {
        throw new NotFoundException(
          `PaymentAttempt with sessionId ${sessionId} not found`,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while trying to update payment attempt by session ID',
      );
    }
  }

  async findPaymentAttemptByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<PaymentAttempt | null> {
    try {
      return await this.paymentAttemptRepository.findOne({
        where: { stripePaymentIntentId: paymentIntentId },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while trying to find payment attempt by payment intent ID',
      );
    }
  }

  async findPaymentAttemptBySubscriptionId(
    subscriptionId: string,
  ): Promise<PaymentAttempt | null> {
    try {
      return await this.paymentAttemptRepository
        .createQueryBuilder('paymentAttempt')
        .where("paymentAttempt.metadata->>'subscriptionId' = :subscriptionId", {
          subscriptionId,
        })
        .getOne();
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while trying to find payment attempt by subscription ID',
      );
    }
  }

  async updatePaymentAttemptByPaymentIntentId(
    paymentIntentId: string,
    updateData: Partial<PaymentAttempt>,
  ) {
    return this.paymentAttemptRepository.update(
      { stripePaymentIntentId: paymentIntentId },
      updateData,
    );
  }

  async updatePaymentAttemptById(
    id: string,
    updateData: Partial<PaymentAttempt>,
  ) {
    return this.paymentAttemptRepository.update(id, updateData);
  }

  async createPaymentAttempt(
    dto: CreatePaymentAttemptDto,
  ): Promise<PaymentAttempt> {
    try {
      const paymentAttempt = this.paymentAttemptRepository.create(dto);
      return await this.paymentAttemptRepository.save(paymentAttempt);
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while trying to create payment attempt',
      );
    }
  }

  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
    const payment = this.paymentRepository.create(dto);
    return this.paymentRepository.save(payment);
  }

  // Private helpers
  private async findOrCreateStripeCustomer(
    userId: string,
  ): Promise<Stripe.Customer> {
    const userEmail = (
      await this.usersService.findOrFail(userId, true, ['email'])
    ).email;

    const { stripeCustomerId, name } =
      await this.billingsService.findBillingInfoByUserId(userId);

    // if customerId is defined in local DB/billingInfo
    if (stripeCustomerId) {
      try {
        const customerFromStripe =
          await this.stripe.customers.retrieve(stripeCustomerId);

        if (customerFromStripe.deleted) {
          await this.billingsService.updateBillingInfo(userId, {
            stripeCustomerId: undefined,
          });
        } else {
          return customerFromStripe as Stripe.Customer;
        }
      } catch (error) {
        if (
          error.code === 'resource_missing' ||
          error.message?.includes('No such customer')
        ) {
          await this.billingsService.updateBillingInfo(userId, {
            stripeCustomerId: undefined,
          });
        } else {
          throw error;
        }
      }
    }

    const existingStripeCustomer = await this.findExistingStripeCustomer(
      userEmail,
      userId,
    );

    if (existingStripeCustomer) {
      await this.billingsService.updateBillingInfo(userId, {
        stripeCustomerId: existingStripeCustomer.id,
      });
      return existingStripeCustomer;
    }

    const customer = await this.createStripeCustomer(userId, userEmail, name);

    await this.billingsService.updateBillingInfo(userId, {
      stripeCustomerId: customer.id,
    });

    return customer;
  }

  private async findExistingStripeCustomer(
    email: string,
    userId: string,
  ): Promise<Stripe.Customer | null> {
    try {
      const customer = (await this.stripe.customers.list({ email, limit: 1 }))
        .data[0];

      if (customer && customer.metadata?.userId === userId) {
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

  private async findCustomerByUserId(
    userId: string,
  ): Promise<Stripe.Customer | null> {
    // Try to get by existing stripeCustomerId in local DB
    const billingInfo =
      await this.billingsService.findBillingInfoByUserId(userId);

    if (billingInfo.stripeCustomerId) {
      try {
        const customer = await this.stripe.customers.retrieve(
          billingInfo.stripeCustomerId,
        );
        return customer as Stripe.Customer;
      } catch (error) {
        throw new InternalServerErrorException(
          `Error while trying to get Stripe customer: ${error.message}`,
        );
      }
    }

    // Gets by email if it doesn't exist in local DB
    const user = await this.usersService.find(userId);
    if (!user.email) {
      return null;
    }

    const customers = await this.stripe.customers.list({
      email: user.email,
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
}
