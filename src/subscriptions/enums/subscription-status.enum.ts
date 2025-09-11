export enum SubscriptionStatus {
  TRIALING = 'trialing', // limited access to pro features
  ACTIVE = 'active', // full access to pro features
  PAST_DUE = 'past_due', // Payment has failed or is overdue; recovery/retry attempts may be in progress
  CANCELLED = 'cancelled', // Subscription cancelled by user or system; no future billing
  EXPIRED = 'expired', // All payment attempts failed; requires manual reactivation/payment
}
