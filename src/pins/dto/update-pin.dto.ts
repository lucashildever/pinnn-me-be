import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

import { UpdateVariantDto } from './variant/update-variant.dto';
import { PinDto } from './pin.dto';

export class UpdatePinDto extends PartialType(
  OmitType(PinDto, ['variants', 'id', 'order']),
) {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantDto)
  variants?: UpdateVariantDto[];
}
