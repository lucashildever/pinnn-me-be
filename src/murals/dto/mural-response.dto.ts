import {
  IsUUID,
  IsArray,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginatedPinsResponseDto } from 'src/pins/dto/pagination/paginated-pins-response.dto';
import { MuralDto } from './mural.dto';
import { CollectionResponseDto } from 'src/collections/dto/collection-response.dto';
import { CallToActionDto } from './call-to-action/call-to-action.dto';

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
  @ValidateNested({ each: true })
  @Type(() => PaginatedPinsResponseDto)
  mainCollectionPins?: PaginatedPinsResponseDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CallToActionDto)
  callToActions?: CallToActionDto[];
}
