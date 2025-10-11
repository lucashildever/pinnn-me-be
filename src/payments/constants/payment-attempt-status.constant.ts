export const PAYMENT_ATTEMPT_STATUSES = {
  Pending: 'pending', // Session created, awaiting payment
  Processing: 'processing', // Checkout completed, payment processing
  Succeeded: 'succeeded', // Payment confirmed
  Failed: 'failed', // Payment failed
  Cancelled: 'cancelled', // Session cancelled/expired
  // avaliar adicionar status abandoned
} as const;
