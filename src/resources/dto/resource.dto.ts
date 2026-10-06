import { PinDto } from 'src/pins/dto/pin.dto';
import { ResourceMetaDto } from './resource-meta.dto';
import { PaginationMetaDto } from 'src/common/dto/pagination/pagination-meta.dto';

export interface PaginatedPinsDto {
  data: PinDto[];
  pagination: PaginationMetaDto;
}

export interface ResourceFromSharedDto {
  pins: PaginatedPinsDto;
}

export interface ResourceDto {
  id: string;
  order: string;
  type: 'pin' | 'shared-pin' | 'pin-group' | 'shared-pin-group';
  pins: PaginatedPinsDto;
  meta?: ResourceMetaDto;
  fromShared?: ResourceFromSharedDto;
}
