export class BillingInfoResponseDto {
  id: string;
  userId: string;
  fullName: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZipCode?: string;
  addressCountry: string;
  currency: string;
  taxId?: string;
  hasStripeCustomer: boolean;
  stripeCustomerId?: string;
  hasDefaultPaymentMethod: boolean;
  updatedAt: Date; // useful for ordering
}
