import { PAYMENT_METHODS } from '../constants/payment-method-type.constant';

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];
