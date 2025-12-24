import {
  IsIn,
  IsUrl,
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { EmbedConfigDto } from './embed-config.dto';
import { IconConfigDto } from 'src/common/dto/icon-config.dto';
import { PIN_VARIANTS } from '../../constants/pin-variants.constant';
import { PinVariant } from '../../types/pin-variant.type';

export class VariantConfigDto {
  @IsIn(PIN_VARIANTS)
  @IsNotEmpty()
  type: PinVariant;

  @ValidateIf(
    (o) =>
      o.type === 'title' ||
      o.type === 'text' ||
      o.type === 'link' ||
      o.type === 'download',
  )
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.type === 'title')
  @MaxLength(50, { message: 'Title content must not exceed 50 characters' })
  @ValidateIf((o) => o.type === 'text')
  @MaxLength(100, { message: 'Text content must not exceed 100 characters' })
  @ValidateIf((o) => o.type === 'link' || o.type === 'download')
  @MaxLength(25, {
    message: 'Link and Download content must not exceed 25 characters',
  })
  content?: string;

  @ValidateIf((o) => o.type === 'link' || o.type === 'download')
  @ValidateNested()
  @Type(() => IconConfigDto)
  iconConfig?: IconConfigDto;

  @ValidateIf(
    (o) =>
      o.type === 'image' ||
      o.type === 'video' ||
      o.type === 'link' ||
      o.type === 'download',
  )
  @IsUrl()
  @IsNotEmpty()
  src?: string;

  @ValidateIf((o) => o.type === 'integration')
  @ValidateNested()
  @Type(() => EmbedConfigDto)
  embedConfig?: EmbedConfigDto;

  /**
   * Original filename of the downloadable file.
   * Optional for now - will be populated by CDN/storage service when configured.
   */
  @ValidateIf((o) => o.type === 'download')
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'File name must not exceed 255 characters' })
  fileName?: string;

  /**
   * File size in bytes.
   * Optional for now - will be populated by CDN/storage service when configured.
   */
  @ValidateIf((o) => o.type === 'download')
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'File size must be a positive number' })
  fileSize?: number;
}
