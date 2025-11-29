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
import { ResourcesService } from './resources.service';
import { PaginationQueryDto } from 'src/pins/dto/pagination/pagination-query.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdatePinDto } from 'src/pins/dto/update-pin.dto';
import { ReorderDto } from 'src/pins/dto/reorder.dto';
import { CreatePinResourceDto } from './dto/create-pin-resource.dto';
import { SharePinResourceDto } from './dto/share-pin-resource.dto';
import { CreatePinGroupResourceDto } from './dto/create-pin-group-resource.dto';
import { SharePinGroupResourceDto } from './dto/share-pin-group-resource.dto';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('paginated/:collectionId')
  async getPaginatedResources(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.resourcesService.findPaginated(collectionId, paginationQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create/:collectionId')
  async createResource(
    @Param('collectionId', new ParseUUIDPipe()) collectionId: string,
    @Body() createResourceDto: CreateResourceDto,
  ) {
    return this.resourcesService.create(collectionId, createResourceDto);
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
  @Delete('delete/:resourceId')
  async deleteResource(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
  ) {
    return this.resourcesService.softDelete(resourceId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update/pin/:resourceId')
  async updatePinResource(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Body() updatePinDto: UpdatePinDto,
  ) {
    return this.resourcesService.updatePinResource(resourceId, updatePinDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('reorder/:resourceId')
  async reorderResource(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Body() reorderDto: ReorderDto,
  ) {
    return this.resourcesService.reorder(resourceId, reorderDto);
  }

  @Get('one/:resourceId')
  async getOneResource(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
  ) {
    return this.resourcesService.findOne(resourceId);
  }
}
