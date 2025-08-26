import { IsEnum, IsOptional } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';

import { CreateSubscriptionDto } from './create-subscription.dto';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

export class UpdateSubscriptionDto extends PartialType(
  OmitType(CreateSubscriptionDto, ['userId']),
) {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}
