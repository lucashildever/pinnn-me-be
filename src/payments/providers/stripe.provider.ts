import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const StripeProvider: Provider = {
  provide: 'STRIPE',
  useFactory: (configService: ConfigService) => {
    const stripeSecretKey = configService.get<string>('stripe.secretKey');

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not defined in environment variables');
    }

    return new Stripe(stripeSecretKey, { apiVersion: '2025-07-30.basil' });
  },
  inject: [ConfigService],
};
