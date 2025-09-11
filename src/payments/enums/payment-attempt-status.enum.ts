export enum PaymentAttemptStatus {
  PENDING = 'pending', // Session created, awaiting payment
  PROCESSING = 'processing', // Checkout completed, payment processing
  SUCCEEDED = 'succeeded', // Payment confirmed
  FAILED = 'failed', // Payment failed
  CANCELLED = 'cancelled', // Session cancelled/expired
  // avaliar adicionar status abandoned
}
