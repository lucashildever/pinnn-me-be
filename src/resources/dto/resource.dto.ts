import { PinDto } from 'src/pins/dto/pin.dto';
import { ResourceMetaDto } from './resource-meta.dto';

export class ResourceDto {
  id: string;
  order: string;
  type: 'pin' | 'shared-pin' | 'pin-group' | 'shared-pin-group';
  pins: PinDto[];
  meta?: ResourceMetaDto;
}
