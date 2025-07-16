import { IsBoolean, IsNumber, Min } from 'class-validator';

export class PaginationMetaDto {
  @IsNumber()
  @Min(1)
  currentPage: number;

  @IsNumber()
  @Min(0)
  totalItems: number;

  @IsNumber()
  @Min(1)
  itemsPerPage: number;
}
