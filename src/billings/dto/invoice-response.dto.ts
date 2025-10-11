import { InvoiceStatus } from '../types/invoice-status.type';
import { InvoiceType } from '../types/invoice-type.type';
import { PlanType } from 'src/plans/types/plan-type.type';

export class InvoiceResponseDto {
  id: string;
  type: InvoiceType;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  planName?: string;
  planType?: PlanType;
  description?: string;
  processedAt?: Date;
  createdAt: Date;
  stripePaymentIntentId?: string;
}
