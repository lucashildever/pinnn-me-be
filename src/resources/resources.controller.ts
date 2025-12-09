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
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { ResourcesService } from './resources.service';
import { PaginationQueryDto } from 'src/common/dto/pagination/pagination-query.dto';
import { UpdatePinDto } from 'src/pins/dto/update-pin.dto';
import { ReorderResourceDto } from './dto/reorder-resource.dto';
import { CreatePinResourceDto } from './dto/create-pin-resource.dto';
import { SharePinResourceDto } from './dto/share-pin-resource.dto';
import { CreatePinGroupResourceDto } from './dto/create-pin-group-resource.dto';
import { SharePinGroupResourceDto } from './dto/share-pin-group-resource.dto';
import { GroupPinsDto } from './dto/group-pins.dto';
import { ResourceDto } from './dto/resource.dto';
import { PaginatedResourcesResponseDto } from './dto/paginated-resources-response.dto';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('collection/:collectionId')
  async getResources(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResourcesResponseDto> {
    return this.resourcesService.findResources(collectionId, paginationQuery);
  }

  @Get(':resourceId')
  async getResource(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
  ): Promise<ResourceDto> {
    return this.resourcesService.findResource(resourceId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create/pin/:collectionId')
  async createPinResource(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
    @Body() createPinResourceDto: CreatePinResourceDto,
  ) {
    return this.resourcesService.createPinResource(
      collectionId,
      createPinResourceDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('create/pin-group/:collectionId')
  async createPinGroupResource(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
    @Body() createPinGroupResourceDto: CreatePinGroupResourceDto,
  ) {
    return this.resourcesService.createPinGroupResource(
      collectionId,
      createPinGroupResourceDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('share/pin/:collectionId')
  async sharePinResource(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
    @Body() sharePinResourceDto: SharePinResourceDto,
  ) {
    return this.resourcesService.sharePinResource(
      collectionId,
      sharePinResourceDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('share/pin-group/:collectionId')
  async sharePinGroupResource(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
    @Body() sharePinGroupResourceDto: SharePinGroupResourceDto,
  ) {
    return this.resourcesService.sharePinGroupResource(
      collectionId,
      sharePinGroupResourceDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':resourceId')
  async deleteResource(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
  ) {
    return this.resourcesService.delete(resourceId);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 1000 } })
  @Patch('reorder/:resourceId')
  async reorder(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Body() reorderDto: ReorderResourceDto,
  ) {
    return this.resourcesService.reorder(resourceId, reorderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('group/:collectionId')
  async group(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
    @Body() groupPinsDto: GroupPinsDto,
  ): Promise<ResourceDto> {
    return this.resourcesService.groupPinResources(collectionId, groupPinsDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ungroup/:resourceId')
  async ungroup(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
  ): Promise<ResourceDto[]> {
    return this.resourcesService.ungroupPinResources(resourceId);
  }
}
