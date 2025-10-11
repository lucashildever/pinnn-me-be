import { SUBSCRIPTION_STATUSES } from '../constants/subscription-status.constant';

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES];
