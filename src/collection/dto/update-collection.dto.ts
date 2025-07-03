import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CollectionTabDto } from './collection-tab.dto';

export class UpdateCollectionDto extends PartialType(
  OmitType(CollectionTabDto, ['order']),
) {}
