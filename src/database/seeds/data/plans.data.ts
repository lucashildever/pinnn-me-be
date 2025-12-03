import { ConfigService } from '@nestjs/config';

export const getPlansData = (configService: ConfigService) => [
  {
    name: 'free',
    type: 'free',
    isDefault: true,
    features: [
      'Verified badge',
      'Pins collections',
      'Apps integration',
      'CTA Button',
      'Tabs and CTA customization',
      'Basic analytics',
      'CTA Banner',
    ],
    limits: {
      variants_per_pin: 4,
      overlapping_variants: 2,
      pins_per_group: 4,
      overlapping_pins: 2,
      own_mural_share_sequence: 1,
    },
  },
  {
    name: 'pro',
    type: 'pro',
    isDefault: false,
    features: [
      'Verified badge',
      'Pins collections',
      'Apps integration',
      'CTA Button',
      'Tabs and CTA customization',
      'Basic analytics',
      'CTA Banner',
    ],
    limits: {
      variants_per_pin: 10,
      overlapping_variants: 5,
      pins_per_group: 10,
      overlapping_pins: 5,
      own_mural_share_sequence: 'unlimited',
    },
    monthlyStripePriceId: configService.get<string>(
      'stripe.prices.pro.monthly',
    ),
    yearlyStripePriceId: configService.get<string>('stripe.prices.pro.yearly'),
  },
];
