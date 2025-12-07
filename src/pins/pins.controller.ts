import {
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PinsService } from './pins.service';
import { UpdatePinDto } from './dto/update-pin.dto';
import { PinDto } from './dto/pin.dto';
import { FindPinsQueryDto } from './dto/find-pins-query.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination/pagination-query.dto';
import { Throttle } from '@nestjs/throttler';
import { PaginatedPinsResponseDto } from './dto/pagination/paginated-pins-response.dto';
import { PaginatedVariantsResponseDto } from './dto/pagination/paginated-variants-response.dto';
import { ReorderDto } from './dto/reorder.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

@Controller('pins')
export class PinsController {
  constructor(private readonly pinsService: PinsService) {}

  @Get()
  async getPins(
    @Query() query: FindPinsQueryDto,
  ): Promise<PaginatedPinsResponseDto> {
    const { resourceId, ...paginationQuery } = query;
    return this.pinsService.findPins(resourceId, paginationQuery);
  }

  @Get(':pinId/variants')
  async getVariants(
    @Param('pinId', ParseUUIDPipe) pinId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedVariantsResponseDto> {
    return this.pinsService.findVariants(pinId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':pinId')
  async updatePin(
    @Param('pinId', ParseUUIDPipe) pinId: string,
    @Body() updatePinDto: UpdatePinDto,
  ): Promise<PinDto> {
    return this.pinsService.update(pinId, updatePinDto);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 1000 } })
  @Patch('reorder/:entityId')
  async reorder(
    @Param('entityId', new ParseUUIDPipe()) entityId: string,
    @Body() reorderDto: ReorderDto,
  ) {
    return this.pinsService.reorder(entityId, reorderDto);
  }
}
