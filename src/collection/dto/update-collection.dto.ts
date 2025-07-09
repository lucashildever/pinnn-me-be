import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { UpdateDisplayElementDto } from 'src/common/dto/update-display-element.dto';
import { CollectionDto } from './collection.dto';

export class UpdateCollectionDto extends PartialType(
  OmitType(CollectionDto, ['order', 'id', 'status', 'displayElement']),
) {
  @ValidateNested()
  @IsOptional()
  @Type(() => UpdateDisplayElementDto)
  displayElement?: UpdateDisplayElementDto;
}
