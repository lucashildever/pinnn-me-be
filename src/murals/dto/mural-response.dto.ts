import {
  IsUUID,
  IsArray,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginatedPinsResponseDto } from 'src/pins/dto/paginated/paginated-pins-response.dto';
import { MuralDto } from './mural.dto';
import { CollectionResponseDto } from 'src/collections/dto/collection-response.dto';

export class MuralResponseDto extends MuralDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectionResponseDto)
  collections?: CollectionResponseDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PaginatedPinsResponseDto)
  mainCollectionPins?: PaginatedPinsResponseDto;
}
