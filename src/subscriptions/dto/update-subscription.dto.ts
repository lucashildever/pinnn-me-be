import { IsEnum, IsOptional } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';

import { CreateSubscriptionDto } from './create-subscription.dto';

import { SUBSCRIPTION_STATUSES } from '../constants/subscription-status.constant';
import { SubscriptionStatus } from '../types/subscription-status.type';

export class UpdateSubscriptionDto extends PartialType(
  OmitType(CreateSubscriptionDto, ['userId']),
) {
  @IsOptional()
  @IsEnum(SUBSCRIPTION_STATUSES)
  status?: SubscriptionStatus;
}
