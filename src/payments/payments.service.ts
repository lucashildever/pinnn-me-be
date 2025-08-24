import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PaymentPeriod } from './enums/payment-period.enum';

import { BillingsService } from 'src/billings/billings.service';
import { UsersService } from 'src/users/users.service';

import { ReactivateStripeSubscriptionResponseDto } from './dto/reactivate-stripe-subscription-response.dto';
import { CheckoutSessionResponseDto } from './dto/checkout-session-response.dto';
import { SessionStatusDto } from './dto/session-status.dto';
import { StripeInvoiceDto } from './dto/stripe-invoice.dto';

import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly billingsService: BillingsService,
    private readonly usersService: UsersService,

    @Inject('STRIPE') private stripe: Stripe,
  ) {}

  async createCheckoutSession(
    userId: string,
    planType: 'pro',
    period: PaymentPeriod,
  ): Promise<CheckoutSessionResponseDto> {
    try {
      const customer = await this.findOrCreateStripeCustomer(userId);
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

  // Private helpers
  private async findOrCreateStripeCustomer(
    userId: string,
  ): Promise<Stripe.Customer> {
    const userEmail = (
      await this.usersService.findOrFail(userId, true, ['email'])
    ).email;

    const { stripeCustomerId, fullName } =
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

    const customer = await this.createStripeCustomer(
      fullName,
      userEmail,
      userId,
    );

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

  // Webhook functions
  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    // Payment logic
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // Payment logic
  }
}
