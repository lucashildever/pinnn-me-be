import {
  IsUUID,
  IsObject,
  IsString,
  MaxLength,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubscriptionDto {
  @IsUUID(4)
  userId: string;

  @IsUUID(4)
  planId: string;

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
