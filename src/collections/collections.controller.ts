import {
  Get,
  Body,
  Post,
  Param,
  Patch,
  Delete,
  UseGuards,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

import { CollectionResponseDto } from './dto/collection-response.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

import { CollectionsService } from './collections.service';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create/:muralId')
  async createCollection(
    @Param('muralId', new ParseUUIDPipe()) muralId: string,
    @Body() createCollectionDto: CreateCollectionDto,
  ): Promise<CollectionResponseDto> {
    return await this.collectionsService.create(muralId, createCollectionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all/:muralId')
  async getMuralCollections(
    @Param('muralId', new ParseUUIDPipe()) muralId: string,
  ): Promise<CollectionResponseDto[]> {
    return this.collectionsService.findAll(muralId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update/:collectionId')
  async updateCollection(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
  ): Promise<CollectionResponseDto> {
    return this.collectionsService.update(collectionId, updateCollectionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:collectionId')
  async deleteCollection(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
  ): Promise<{ message: string }> {
    return this.collectionsService.softDelete(collectionId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('reorder/:collectionId/:newOrder')
  async reorderCollections(
    @Param('collectionId') collectionId: string,
    @Param('newOrder') newOrder: string,
  ) {
    return this.collectionsService.reorder(collectionId, newOrder);
  }
}
