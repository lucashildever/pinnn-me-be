import {
  IsEnum,
  IsArray,
  IsObject,
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  ArrayNotEmpty,
} from 'class-validator';
import { PLAN_TYPES } from '../constants/plan-types.constant';
import { PlanType } from '../types/plan-type.type';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(PLAN_TYPES)
  type: PlanType;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @IsNotEmpty()
  @ArrayNotEmpty()
  @IsString({ each: true })
  features: string[];

  @IsObject()
  @IsNotEmpty()
  limits: Record<string, any>;

  @IsString()
  @IsOptional()
  monthlyStripePriceId?: string;

  @IsString()
  @IsOptional()
  yearlyStripePriceId?: string;
}
