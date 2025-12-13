import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

import { INVOICE_STATUSES } from '../constants/invoice-status.constant';
import { InvoiceStatus } from '../types/invoice-status.type';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsEnum(INVOICE_STATUSES)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;

  @IsOptional()
  @IsString()
  stripeInvoiceId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  processedAt?: Date;

  @IsOptional()
  @IsString()
  subscriptionId?: string;
}
