export class BillingInfoResponseDto {
  id: string;
  userId: string;
  name: string;
  currency: string;
  hasStripeCustomer: boolean;
  stripeCustomerId?: string;
  updatedAt: Date; // useful for ordering
}
