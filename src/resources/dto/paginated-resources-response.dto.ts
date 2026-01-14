import { PaginationMetaDto } from 'src/common/dto/pagination/pagination-meta.dto';
import { ResourceDto } from './resource.dto';
import { PinnedResourceWithDataDto } from './pinned-resource-with-data.dto';

export class PaginatedResourcesResponseDto {
  pinnedResources?: PinnedResourceWithDataDto[];
  resources: ResourceDto[];
  pagination: PaginationMetaDto;
}
