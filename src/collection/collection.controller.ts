import { Controller, Get, Param, Query } from '@nestjs/common';
import { CollectionService } from './collection.service';

@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  // this endpoint will:
  // - provide the first pins of a collection when the user changes selected collection, or the first pins of the
  // default/selectes col when the page loads
  // - this will be used also to load more pins of a collection (pagination)
  @Get(':muralName/:collectionId')
  getCollectionPins(
    @Param('muralName') muralName: string,
    @Param('collectionId') collectionId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.collectionService.findCollectionPins();
  }
}
