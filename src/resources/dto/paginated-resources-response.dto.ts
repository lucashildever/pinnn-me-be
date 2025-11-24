import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { ResourceDto } from './resource.dto';

export class PaginatedResourcesResponseDto extends PaginatedResponseDto<ResourceDto> { }
