import { IsBoolean, IsOptional } from 'class-validator';
import { CollectionTabDto } from './collection-tab.dto';
import { OmitType } from '@nestjs/mapped-types';

export class CreateCollectionDto extends OmitType(CollectionTabDto, [
  'order',
  'isMain',
  'status',
  'id',
]) {
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}
