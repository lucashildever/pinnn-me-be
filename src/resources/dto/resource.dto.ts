import { PinDto } from 'src/pins/dto/pin.dto';
import { ResourceMetaDto } from './resource-meta.dto';
import { PaginationMetaDto } from 'src/common/dto/pagination/pagination-meta.dto';

export class PaginatedPinsDto {
  data: PinDto[];
  pagination: PaginationMetaDto;
}

export class ResourceFromSharedDto {
  pins: PaginatedPinsDto;
}

export class ResourceDto {
  id: string;
  order: string;
  type: 'pin' | 'shared-pin' | 'pin-group' | 'shared-pin-group';
  pins: PaginatedPinsDto;
  meta?: ResourceMetaDto;
  fromShared?: ResourceFromSharedDto;
}
