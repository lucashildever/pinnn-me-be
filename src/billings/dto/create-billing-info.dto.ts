import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBillingInfoDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsNotEmpty()
  stripeCustomerId: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
