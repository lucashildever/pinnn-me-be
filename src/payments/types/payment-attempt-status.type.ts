import { PAYMENT_ATTEMPT_STATUSES } from '../constants/payment-attempt-status.constant';

export type PaymentAttemptStatus =
  (typeof PAYMENT_ATTEMPT_STATUSES)[keyof typeof PAYMENT_ATTEMPT_STATUSES];
