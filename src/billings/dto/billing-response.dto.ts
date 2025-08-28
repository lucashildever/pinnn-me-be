export class BillingInfoResponseDto {
  id: string;
  userId: string;
  fullName: string;
  currency: string;
  hasStripeCustomer: boolean;
  stripeCustomerId?: string;
  updatedAt: Date; // useful for ordering
}
