import { CollectionTabDto } from './collection-tab.dto';
import { OmitType } from '@nestjs/mapped-types';

export class CollectionResponseDto extends OmitType(CollectionTabDto, [
  'status',
]) {}
