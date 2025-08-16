import { PaginationMetaDto } from './pagination-meta.dto';
import { PinDto } from '../pin.dto';

export class PaginatedPinsResponseDto {
  data: PinDto[];
  pagination: PaginationMetaDto;
}
