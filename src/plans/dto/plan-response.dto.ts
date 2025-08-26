import { CreatePlanDto } from './create-plan.dto';

export class PlanResponseDto extends CreatePlanDto {
  id: string;
  prices: {
    price: number;
    billingPeriod: 'monthly' | 'yearly';
    currency: string;
    stripePriceId: string;
  }[];
}
