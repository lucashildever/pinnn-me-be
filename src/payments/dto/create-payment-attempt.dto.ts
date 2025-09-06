import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentAttemptDto {
  @IsString()
  @IsOptional()
  stripeSessionId?: string;

  @IsString()
  @IsOptional()
  stripePaymentIntentId?: string;

  @IsString()
  @IsOptional()
  stripeChargeId?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
