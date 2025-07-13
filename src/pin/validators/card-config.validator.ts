import {
  IsUrl,
  IsEnum,
  IsString,
  ValidateIf,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CardIconConfigValidator } from './card-icon-config.validator';
import { CardIconConfig } from '../types/card-icon-config';

import { CardVariant } from '../enums/card-variant.enum';

export class CardConfigValidator {
  @IsEnum(CardVariant)
  variant: CardVariant;

  @ValidateIf((o) => o.variant === CardVariant.Image)
  @IsUrl()
  @IsString()
  @IsNotEmpty()
  src?: string;

  @ValidateIf((o) => o.variant === CardVariant.Link)
  @ValidateNested()
  @Type(() => CardIconConfigValidator)
  icon?: CardIconConfig;

  @ValidateIf((o) => o.variant === CardVariant.Link)
  @IsUrl()
  @IsNotEmpty()
  @IsString()
  href?: string;
}
