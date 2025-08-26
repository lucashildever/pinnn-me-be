import {
  IsEnum,
  IsArray,
  IsObject,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  ArrayNotEmpty,
} from 'class-validator';

import { PlanType } from '../enums/plan-type.enum';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(PlanType)
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

  @IsNumber()
  @IsOptional()
  monthlyPrice?: number;

  @IsNumber()
  @IsOptional()
  yearlyPrice?: number;
}
