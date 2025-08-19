import {
  IsEnum,
  IsArray,
  IsObject,
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreatePriceDto } from './create-price.dto';

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

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreatePriceDto)
  prices: CreatePriceDto[];
}
