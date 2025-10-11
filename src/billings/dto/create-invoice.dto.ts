import {
  Min,
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

import { INVOICE_TYPES } from '../constants/invoice-types.constant';
import { InvoiceType } from '../types/invoice-type.type';
import { PLAN_TYPES } from 'src/plans/constants/plan-types.constant';
import { PlanType } from 'src/plans/types/plan-type.type';

export class CreateInvoiceDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  billingInfoId: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsEnum(INVOICE_TYPES)
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
  @IsEnum(PLAN_TYPES)
  planType?: PlanType;

  @IsOptional()
  @IsString()
  description?: string;
}
