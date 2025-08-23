import { InvoiceStatus } from '../enums/invoice-status.enum';
import { InvoiceType } from '../enums/invoice-type.enum';
import { PlanType } from 'src/plans/enums/plan-type.enum';

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
