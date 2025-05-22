import { Injectable } from '@nestjs/common';

@Injectable()
export class CollectionService {
  findCollectionPins(): string {
    return 'collection pins';
  }

  findCollectionNames(): string {
    return 'return collection tab names';
  }
}
