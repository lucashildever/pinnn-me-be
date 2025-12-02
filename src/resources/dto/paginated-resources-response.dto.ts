import { PaginationMetaDto } from 'src/common/dto/pagination/pagination-meta.dto';
import { ResourceDto } from './resource.dto';

export class PaginatedResourcesResponseDto {
  resources: ResourceDto[];
  pagination: PaginationMetaDto;
}
