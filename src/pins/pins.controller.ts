import { Controller, Get, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { PinsService } from './pins.service';
import { FindPinsQueryDto } from './dto/find-pins-query.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination/pagination-query.dto';
import { PaginatedPinsResponseDto } from './dto/pagination/paginated-pins-response.dto';
import { PaginatedVariantsResponseDto } from './dto/pagination/paginated-variants-response.dto';

@Controller('pins')
export class PinsController {
  constructor(private readonly pinsService: PinsService) {}

  @Get()
  async findPins(
    @Query() query: FindPinsQueryDto,
  ): Promise<PaginatedPinsResponseDto> {
    const { resourceId, ...paginationQuery } = query;
    return this.pinsService.findPins(resourceId, paginationQuery);
  }

  @Get(':pinId/variants')
  async findVariants(
    @Param('pinId', ParseUUIDPipe) pinId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedVariantsResponseDto> {
    return this.pinsService.findVariants(pinId, query);
  }
}
