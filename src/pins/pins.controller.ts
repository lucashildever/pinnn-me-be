import {
  Body,
  Get,
  Post,
  Query,
  Param,
  Patch,
  Delete,
  UseGuards,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

import { PaginationQueryDto } from './dto/pagination/pagination-query.dto';
import { CreatePinDto } from './dto/create-pin.dto';
import { UpdatePinDto } from './dto/update-pin.dto';
import { ReorderDto } from './dto/reorder.dto';
import { PinDto } from './dto/pin.dto';

import { PinsService } from './pins.service';

@Controller('pins')
export class PinsController {
  constructor(private readonly pinsService: PinsService) {}

  @Get('paginated/:collectionId')
  async getPaginatedPins(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.pinsService.findPaginated(collectionId, paginationQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:pinId')
  async deletePin(
    @Param('pinId', new ParseUUIDPipe()) pinId: string,
  ): Promise<{ message: string }> {
    return this.pinsService.softDelete(pinId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create/:collectionId')
  async createPin(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
    @Body() createPinDto: CreatePinDto,
  ): Promise<PinDto> {
    return this.pinsService.create(collectionId, createPinDto);
  }

  @Get('one/:pinId')
  async getOnePin(
    @Param('pinId', new ParseUUIDPipe()) pinId: string,
  ): Promise<PinDto> {
    return this.pinsService.findOne(pinId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update/:pinId')
  async updatePin(
    @Param('pinId', new ParseUUIDPipe()) pinId: string,
    @Body() updatePinDto: UpdatePinDto,
  ) {
    return this.pinsService.update(pinId, updatePinDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('reorder/:id')
  async reorderPin(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() reorderDto: ReorderDto,
  ) {
    return this.pinsService.reorder(id, reorderDto);
  }
}
