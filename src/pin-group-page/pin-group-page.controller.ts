import { Controller, Get, Param, Query } from '@nestjs/common';
import { PinGroupPageService } from './pin-group-page.service';

@Controller('pin-group-page')
export class PinGroupPageController {
  constructor(private readonly pinGroupPageService: PinGroupPageService) {}

  // - will provide the first default pins of a PGP
  // (that appear out of the PGP)
  // - and will also load more pins when inside the PGP
  @Get(':muralName/:collectionId/:pinGroupPageId')
  getPinGroupPagePins(
    @Param('muralName') muralName: string,
    @Param('collectionId') collectionId: string,
    @Param('pinGroupPageId') pinGroupPageId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {}
}
