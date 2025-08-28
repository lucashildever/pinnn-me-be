import { CreatePlanDto } from './create-plan.dto';

export class PlanResponseDto extends CreatePlanDto {
  id: string;
  prices: {
    billingPeriod: 'monthly' | 'yearly';
    stripePriceId: string;
  }[];
}
