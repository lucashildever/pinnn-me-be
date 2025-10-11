import { PAYMENT_STATUSES } from '../constants/payment-statuses.constant';

export type PaymentStatus =
  (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];
