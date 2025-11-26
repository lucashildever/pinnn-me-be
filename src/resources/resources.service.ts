import {
  Logger,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ResourceEntity } from './entities/resource.entity';
import { PinsService } from 'src/pins/pins.service';
import { PinEntity } from 'src/pins/entities/pin.entity';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { FractionalIndexingService } from 'src/common/services/fractional-indexing.service';
import { PaginationQueryDto } from 'src/pins/dto/pagination/pagination-query.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { PaginatedResourcesResponseDto } from './dto/paginated-resources-response.dto';
import { UpdatePinDto } from 'src/pins/dto/update-pin.dto';
import { ReorderDto } from 'src/pins/dto/reorder.dto';

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourcesRepository: Repository<ResourceEntity>,
    private readonly pinsService: PinsService,
    private readonly fractionalIndexingService: FractionalIndexingService,
    private readonly dataSource: DataSource,
  ) {}

  async findPaginated(
    collectionId: string,
    paginationQueryDto: PaginationQueryDto,
  ): Promise<PaginatedResourcesResponseDto> {
    const { page = 1, limit = 10 } = paginationQueryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.resourcesRepository
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.pin', 'pin')
      .leftJoinAndSelect('pin.variants', 'variants')
      .where('resource.collectionId = :collectionId', { collectionId })
      .andWhere('resource.status = :status', { status: 'active' })
      .orderBy('resource.order', 'ASC')
      .skip(skip)
      .take(limit);

    const [resources, total] = await queryBuilder.getManyAndCount();

    const transformedResources = resources.map((resource) => ({
      id: resource.id,
      type: resource.type,
      collectionId: resource.collectionId,
      order: resource.order,
      ...(resource.pin && {
        pin: {
          id: resource.pin.id,
          order: resource.pin.order,
          variants: resource.pin.variants.map((variant) => ({
            id: variant.id,
            order: variant.order,
            config: variant.config,
          })),
        },
      }),
    }));

    return {
      data: transformedResources,
      pagination: {
        currentPage: page,
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async createResource(
    collectionId: string,
    createResourceDto: CreateResourceDto,
  ) {
    const { type, data } = createResourceDto;

    switch (type) {
      case 'pin':
        return await this.createPinResource(collectionId, data);

      case 'shared-pin':
        throw new BadRequestException(
          `Resource type '${type}' is not yet implemented`,
        );

      case 'pin-group':
        throw new BadRequestException(
          `Resource type '${type}' is not yet implemented`,
        );

      case 'shared-pin-group':
        throw new BadRequestException(
          `Resource type '${type}' is not yet implemented`,
        );

      default:
        throw new BadRequestException(`Unknown resource type: ${type}`);
    }
  }

  private async createPinResource(collectionId: string, createPinDto: any) {
    return await this.dataSource.transaction(async (manager) => {
      // Check collection exists
      const collection = await manager.findOne(CollectionEntity, {
        where: { id: collectionId },
      });
      if (!collection) throw new NotFoundException('Collection not found');

      // Generate order for Resource
      const maxOrderResult = await manager
        .createQueryBuilder(ResourceEntity, 'resource')
        .select('MAX(resource.order)', 'maxOrder')
        .where('resource.collectionId = :collectionId', { collectionId })
        .getRawOne();

      const nextOrder = this.fractionalIndexingService.generateKeyBetween(
        maxOrderResult?.maxOrder || null,
        null,
      );

      // Create pin without collectionId - it's now independent
      const createdPin = await this.pinsService.create(createPinDto);

      const resource = manager.create(ResourceEntity, {
        type: 'pin',
        collectionId,
        order: nextOrder,
        pin: { id: createdPin.id },
      });

      return await manager.save(resource);
    });
  }

  async softDelete(resourceId: string) {
    const resource = await this.resourcesRepository.findOne({
      where: { id: resourceId },
    });

    if (!resource) throw new NotFoundException('Resource not found');

    resource.status = 'deleted';
    await this.resourcesRepository.softRemove(resource);

    return { message: `Resource ${resourceId} successfully deleted` };
  }

  async updatePinResource(resourceId: string, updatePinDto: UpdatePinDto) {
    const resource = await this.resourcesRepository.findOne({
      where: { id: resourceId },
      relations: ['pin'],
    });

    if (!resource || resource.type !== 'pin' || !resource.pin) {
      throw new NotFoundException('Pin Resource not found');
    }

    return await this.pinsService.update(resource.pin.id, updatePinDto);
  }

  async reorder(resourceId: string, reorderDto: ReorderDto) {
    // Implement fractional indexing reorder for ResourceEntity
    // Similar to PinsService.reorder but for Resources
    return await this.dataSource.transaction(async (manager) => {
      const resource = await manager.findOne(ResourceEntity, {
        where: { id: resourceId },
      });
      if (!resource) throw new NotFoundException('Resource not found');

      const { newOrder } = reorderDto;

      // Check for collisions (optional but good)
      // Update order
      resource.order = newOrder;
      await manager.save(resource);

      return { message: 'Resource reordered successfully' };
    });
  }

  async findOne(resourceId: string) {
    const resource = await this.resourcesRepository
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.pin', 'pin')
      .leftJoinAndSelect('pin.variants', 'variants')
      .where('resource.id = :resourceId', { resourceId })
      .andWhere('resource.status = :status', { status: 'active' })
      .getOne();

    if (!resource) throw new NotFoundException('Resource not found');
    return resource;
  }
}
