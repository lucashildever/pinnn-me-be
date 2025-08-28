import {
  IsUUID,
  IsString,
  MaxLength,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubscriptionDto {
  @IsUUID(4)
  userId: string;

  @IsString()
  planName: string;

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
  stripeSubscriptionId?: string;
}
