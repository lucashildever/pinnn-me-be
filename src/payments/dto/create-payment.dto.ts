import {
  Min,
  IsUUID,
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { PaymentStatus } from '../enums/payment-status.enum';

export class CreatePaymentDto {
  @IsUUID()
  invoiceId: string;

  @IsOptional()
  @IsUUID()
  originAttemptId?: string;

  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;

  @IsOptional()
  @IsString()
  stripeChargeId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
