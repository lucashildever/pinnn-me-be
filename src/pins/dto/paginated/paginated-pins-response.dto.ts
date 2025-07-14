import {
  Min,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PinDto } from '../pin.dto';

export class PaginatedPinsResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PinDto)
  data: PinDto[];

  @ValidateNested()
  @Type(() => PaginationMetaDto)
  pagination: PaginationMetaDto;
}

class PaginationMetaDto {
  @IsNumber()
  @Min(1)
  currentPage: number;

  @IsNumber()
  @Min(1)
  totalPages: number;

  @IsNumber()
  @Min(0)
  totalItems: number;

  @IsNumber()
  @Min(1)
  itemsPerPage: number;

  @IsBoolean()
  hasNextPage: boolean;

  @IsBoolean()
  hasPreviousPage: boolean;
}
