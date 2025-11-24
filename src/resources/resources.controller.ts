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

@Controller('resources')
export class ResourcesController {
    constructor(private readonly resourcesService: ResourcesService) { }

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
        return this.resourcesService.createResource(collectionId, createResourceDto);
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

    @UseGuards(JwtAuthGuard)
    @Patch('variant/reorder/:variantId')
    async reorderVariant(
        @Param('variantId', new ParseUUIDPipe()) variantId: string,
        @Body() reorderDto: ReorderDto,
    ) {
        return this.resourcesService.reorderVariant(variantId, reorderDto);
    }
}
