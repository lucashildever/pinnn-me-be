import { CreatePriceDto } from './create-price.dto';

export interface CreatePlanDto {
  name: string;
  slug: string;
  isDefault?: boolean;
  features: string[];
  limits: Record<string, any>;
  prices: CreatePriceDto[];
}
