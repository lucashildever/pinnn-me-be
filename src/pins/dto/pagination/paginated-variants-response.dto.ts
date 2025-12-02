import { PaginationMetaDto } from 'src/common/dto/pagination/pagination-meta.dto';
import { VariantDto } from '../variant/variant.dto';

export class PaginatedVariantsResponseDto {
  variants: VariantDto[];
  pagination: PaginationMetaDto;
}
