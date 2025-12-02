import { IsNotEmpty, IsUUID } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination/pagination-query.dto';

export class FindPinsQueryDto extends PaginationQueryDto {
  @IsNotEmpty()
  @IsUUID()
  resourceId: string;
}
