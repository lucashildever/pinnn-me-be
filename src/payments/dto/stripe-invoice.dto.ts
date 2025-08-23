import Stripe from 'stripe';

export type StripeInvoiceDto = {
  id: string | undefined;
  amount: number;
  currency: Stripe.Invoice['currency'];
  status: Stripe.Invoice['status'];
  created: Date;
  pdfUrl?: string | null;
};
