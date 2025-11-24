import { PaginationMetaDto } from 'src/pins/dto/pagination/pagination-meta.dto';

export class PaginatedResponseDto<T> {
    data: T[];
    pagination: PaginationMetaDto;
}
