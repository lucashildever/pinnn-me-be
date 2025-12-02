import { PinDto } from 'src/pins/dto/pin.dto';
import { ResourceMetaDto } from './resource-meta.dto';

export class ResourceDto {
  id: string;
  order: string;
  pins: PinDto[];
  meta?: ResourceMetaDto;
}
