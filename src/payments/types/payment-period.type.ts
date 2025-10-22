import { PAYMENT_PERIODS } from '../constants/payment-period.constant';

export type PaymentPeriod = (typeof PAYMENT_PERIODS)[number];
