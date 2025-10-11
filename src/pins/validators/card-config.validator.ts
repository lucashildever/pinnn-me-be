import {
  IsUrl,
  IsEnum,
  IsString,
  ValidateIf,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { IconConfigValidator } from 'src/common/validators/icon-config.validator';

import { IconConfig } from 'src/common/types/icon-config.type';

import { CARD_VARIANTS } from '../constants/card-variant.constant';
import { CardVariant } from '../types/card-variant.type';

export class CardConfigValidator {
  @IsEnum(CARD_VARIANTS)
  variant: CardVariant;

  @ValidateIf((o) => o.variant === 'image')
  @IsUrl()
  @IsString()
  @IsNotEmpty()
  src?: string;

  @ValidateIf((o) => o.variant === 'link' || o.variant === 'download')
  @ValidateNested()
  @Type(() => IconConfigValidator)
  iconConfig?: IconConfig;

  @ValidateIf((o) => o.variant === 'link')
  @IsUrl()
  @IsString()
  @IsNotEmpty()
  href?: string;
}
