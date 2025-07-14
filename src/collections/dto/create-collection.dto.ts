import { CollectionDto } from './collection.dto';
import { OmitType } from '@nestjs/mapped-types';

export class CreateCollectionDto extends OmitType(CollectionDto, [
  'order',
  'status',
  'id',
]) {}
