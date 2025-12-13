export const SUBSCRIPTION_STATUSES = {
  Trialing: 'trialing', // limited access to pro features
  Active: 'active', // full access to pro features
  PastDue: 'past-due', // Payment has failed or is overdue; recovery/retry attempts may be in progress
  Cancelled: 'canceled', // Subscription cancelled by user or system; no future billing
  Expired: 'expired', // All payment attempts failed; requires manual reactivation/payment
} as const;
