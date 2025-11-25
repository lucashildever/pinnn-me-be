import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { PinDto } from '../pin.dto';

export class PaginatedPinsResponseDto extends PaginatedResponseDto<PinDto> {}
