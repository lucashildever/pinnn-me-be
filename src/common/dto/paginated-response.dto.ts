import { PaginationMetaDto } from 'src/common/dto/pagination/pagination-meta.dto';

export class PaginatedResponseDto<T> {
  data: T[];
  pagination: PaginationMetaDto;
}
