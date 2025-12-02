import { PaginationMetaDto } from 'src/common/dto/pagination/pagination-meta.dto';
import { PinDto } from '../pin.dto';

export class PaginatedPinsResponseDto {
  pins: PinDto[];
  pagination: PaginationMetaDto;
}
