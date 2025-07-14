import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

import { UpdateCardDto } from './card/update-card.dto';
import { PinDto } from './pin.dto';

export class UpdatePinDto extends PartialType(
  OmitType(PinDto, ['cards', 'id', 'order']),
) {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCardDto)
  cards?: UpdateCardDto[];
}
