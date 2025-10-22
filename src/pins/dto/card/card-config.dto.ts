import {
  IsIn,
  IsUrl,
  IsNotEmpty,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { EmbedConfigDto } from './embed-config.dto';
import { IconConfigDto } from 'src/common/dto/icon-config.dto';

export class CardConfigDto {
  @IsIn(['link', 'download', 'image', 'integration'])
  @IsNotEmpty()
  variant: string;

  @ValidateIf((o) => o.variant === 'link')
  @IsUrl()
  @IsNotEmpty()
  href?: string;

  @ValidateIf((o) => o.variant === 'link' || o.variant === 'download')
  @ValidateNested()
  @Type(() => IconConfigDto)
  iconConfig?: IconConfigDto;

  @ValidateIf((o) => o.variant === 'image')
  @IsUrl()
  @IsNotEmpty()
  src?: string;

  @ValidateIf((o) => o.variant === 'integration')
  @ValidateNested()
  @Type(() => EmbedConfigDto)
  embedConfig?: EmbedConfigDto;
}
