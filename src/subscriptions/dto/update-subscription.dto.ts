import {
  IsEnum,
  IsString,
  IsObject,
  MaxLength,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

import { SubscriptionStatus } from '../enums/subscription-status.enum';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  startAt?: Date;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  currentPeriodEnd?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingProviderId?: string;
}
