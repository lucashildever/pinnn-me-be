import { PaginatedPinsResponseDto } from 'src/pins/dto/pagination/paginated-pins-response.dto';
import { MuralDto } from './mural.dto';
import { CollectionResponseDto } from 'src/collections/dto/collection-response.dto';
import { CallToActionDto } from './call-to-action/call-to-action.dto';

export class MuralResponseDto extends MuralDto {
  id: string;
  collections?: CollectionResponseDto[];
  mainCollectionPins?: PaginatedPinsResponseDto;
  callToActions?: CallToActionDto[];
}
