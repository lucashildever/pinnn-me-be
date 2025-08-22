import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PaymentPeriod } from '../enums/payment-period.enum';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  planType: 'pro';

  @IsNotEmpty()
  @IsEnum(PaymentPeriod)
  period: PaymentPeriod;
}
