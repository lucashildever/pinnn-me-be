import {
  Min,
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

import { InvoiceType } from '../enums/invoice-type.enum';
import { PlanType } from 'src/plans/enums/plan-type.enum';

export class CreateInvoiceDto {
  @IsUUID()
  billingInfoId: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsEnum(InvoiceType)
  type: InvoiceType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;

  @IsOptional()
  @IsString()
  stripeInvoiceId?: string;

  @IsOptional()
  @IsString()
  planName?: string;

  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;

  @IsOptional()
  @IsString()
  description?: string;
}
