import { IsArray, ValidateNested } from 'class-validator';
import { PaginationMetaDto } from './pagination-meta.dto';
import { PinDto } from '../pin.dto';

import { Type } from 'class-transformer';

export class PaginatedPinsResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PinDto)
  data: PinDto[];

  @ValidateNested()
  @Type(() => PaginationMetaDto)
  pagination: PaginationMetaDto;
}
