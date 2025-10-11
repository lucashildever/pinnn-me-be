import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PAYMENT_PERIODS } from '../constants/payment-period.constant';
import { PaymentPeriod } from '../types/payment-period.type';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  planType: 'pro';

  @IsNotEmpty()
  @IsEnum(PAYMENT_PERIODS)
  period: PaymentPeriod;
}
