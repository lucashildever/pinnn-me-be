import { ResourceType } from '../types/resource-type.type';
import { VariantConfigDto } from 'src/pins/dto/variant/variant-config.dto';

export class ResourceDto {
  id: string;
  type: ResourceType;
  collectionId: string;
  order: string;
  pin?: {
    id: string;
    order: string;
    variants: Array<{
      id: string;
      order: string;
      config: VariantConfigDto;
    }>;
  };
}
