import { CollectionDto } from './collection.dto';
import { OmitType } from '@nestjs/mapped-types';

export class CollectionResponseDto extends OmitType(CollectionDto, [
  'status',
]) {}
