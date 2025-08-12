import { IsIn, IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ISO_CURRENCIES } from '../constants/currencies.constant';

export class CreatePriceDto {
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsIn(['monthly', 'yearly'])
  billingPeriod: string;

  @IsString()
  @IsIn(ISO_CURRENCIES, {
    each: true,
    message: `Each currency must be one of: ${ISO_CURRENCIES.join(', ')}`,
  })
  currency: string;
}
