import { TransactionStatus } from '../enums/transaction-status.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { PlanType } from 'src/plans/enums/plan-type.enum';

export class TransactionResponseDto {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  planName?: string;
  planType?: PlanType;
  description?: string;
  processedAt?: Date;
  createdAt: Date;
  stripePaymentIntentId?: string;
}
