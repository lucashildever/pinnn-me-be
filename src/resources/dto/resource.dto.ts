import { PinDto } from 'src/pins/dto/pin.dto';

export class ResourceDto {
  id: string;
  order: string;
  data?: PinDto | PinDto[];
}
