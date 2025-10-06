import {
  IsUrl,
  IsEnum,
  IsString,
  ValidateIf,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

import { IconConfigValidator } from 'src/common/validators/icon-config.validator';

import { CardVariant } from '../enums/card-variant.enum';
import { IconConfig } from 'src/common/types/icon-config.type';

export class CardConfigValidator {
  @IsEnum(CardVariant)
  variant: CardVariant;

  @ValidateIf((o) => o.variant === CardVariant.IMAGE)
  @IsUrl()
  @IsString()
  @IsNotEmpty()
  src?: string;

  @ValidateIf(
    (o) => o.variant === CardVariant.LINK || o.variant === CardVariant.DOWNLOAD,
  )
  @ValidateNested()
  @Type(() => IconConfigValidator)
  iconConfig?: IconConfig;

  @ValidateIf((o) => o.variant === CardVariant.LINK)
  @IsUrl()
  @IsString()
  @IsNotEmpty()
  href?: string;
}
