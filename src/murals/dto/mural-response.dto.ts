import { PaginatedResourcesResponseDto } from 'src/resources/dto/paginated-resources-response.dto';
import { MuralDto } from './mural.dto';
import { CollectionResponseDto } from 'src/collections/dto/collection-response.dto';
import { CallToActionDto } from './call-to-action/call-to-action.dto';
import { MuralAppearanceDto } from './appearance/mural-appearance.dto';

export class MuralResponseDto extends MuralDto {
  id: string;
  collections?: CollectionResponseDto[];
  mainCollectionResources?: PaginatedResourcesResponseDto;
  callToActions?: CallToActionDto[];
  appearance?: MuralAppearanceDto;
}
