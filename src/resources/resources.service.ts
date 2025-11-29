import { Logger, Injectable, NotFoundException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ResourceEntity } from './entities/resource.entity';
import { ResourceMetaEntity } from './entities/resource-meta.entity';
import { PinsService } from 'src/pins/pins.service';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { FractionalIndexingService } from 'src/common/services/fractional-indexing.service';
import { PaginationQueryDto } from 'src/pins/dto/pagination/pagination-query.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { PaginatedResourcesResponseDto } from './dto/paginated-resources-response.dto';
import { UpdatePinDto } from 'src/pins/dto/update-pin.dto';
import { ReorderDto } from 'src/pins/dto/reorder.dto';
import { CreatePinResourceDto } from './dto/create-pin-resource.dto';
import { SharePinResourceDto } from './dto/share-pin-resource.dto';
import { CreatePinGroupResourceDto } from './dto/create-pin-group-resource.dto';
import { SharePinGroupResourceDto } from './dto/share-pin-group-resource.dto';
import { PinEntity } from 'src/pins/entities/pin.entity';
import { PinMetaEntity } from 'src/pins/entities/pin-meta.entity';
import { VariantEntity } from 'src/pins/entities/variant.entity';

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
      .leftJoinAndSelect('resource.pins', 'pin')
      .leftJoinAndSelect('pin.variants', 'variants')
      .where('resource.collectionId = :collectionId', { collectionId })
      .andWhere('resource.status = :status', { status: 'active' })
      .orderBy('resource.order', 'ASC')
      .skip(skip)
      .take(limit);

    const [resources, total] = await queryBuilder.getManyAndCount();

    const transformedResources = resources.map((resource) => ({
      id: resource.id,

      order: resource.order,
      ...(resource.pins &&
        resource.pins.length > 0 && {
          pins: resource.pins.map((pin) => ({
            id: pin.id,
            order: pin.order,
            variants: pin.variants.map((variant) => ({
              id: variant.id,
              order: variant.order,
              config: variant.config,
            })),
          })),
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

  async create(collectionId: string, createResourceDto: CreateResourceDto) {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager.findOne(CollectionEntity, {
        where: { id: collectionId },
      });

      if (!collection) throw new NotFoundException('Collection not found');

      const lastResource = await manager
        .createQueryBuilder(ResourceEntity, 'resource')
        .select('resource.order')
        .where('resource.collectionId = :collectionId', { collectionId })
        .orderBy('resource.order', 'DESC')
        .limit(1)
        .getRawOne();

      const nextOrder = this.fractionalIndexingService.generateKeyBetween(
        lastResource?.resource_order || null,
        null,
      );

      const createdPins = [];
      for (const createPinDto of createResourceDto.pins) {
        const createdPin = await this.pinsService.createWithManager(
          manager,
          createPinDto,
        );
        createdPins.push(createdPin);
      }

      const resourceMeta = new ResourceMetaEntity();

      // for shared Pin Groups
      if (createResourceDto.sharedResourceId) {
        const sharedResource = await manager.findOne(ResourceEntity, {
          where: { id: createResourceDto.sharedResourceId },
          relations: ['resourceMeta'],
        });

        if (!sharedResource) {
          throw new NotFoundException('Shared resource not found');
        }

        resourceMeta.sharedResourceId = createResourceDto.sharedResourceId;
        resourceMeta.firstResourceId =
          sharedResource.resourceMeta.firstResourceId;

        const currentHistory = sharedResource.resourceMeta.history || [];
        const maxOrder = currentHistory.reduce(
          (max, item) => (item.order > max ? item.order : max),
          0,
        );

        const newHistoryItem = {
          sharedMuralId: createResourceDto.sourceMuralId || '',
          order: maxOrder + 1,
        };

        let newHistory = [...currentHistory, newHistoryItem];

        if (newHistory.length > 5) {
          const minOrder = newHistory.reduce(
            (min, item) => (item.order < min ? item.order : min),
            Infinity,
          );
          newHistory = newHistory.filter((item) => item.order !== minOrder);
        }

        resourceMeta.history = newHistory;
      } else if (createResourceDto.pins.length > 1) {
        // New Pin Group
        resourceMeta.groupName = createResourceDto.groupName || null;
      }

      const resource = manager.create(ResourceEntity, {
        collectionId,
        order: nextOrder,
        pins: createdPins.map((p) => ({ id: p.id })),
        resourceMeta,
      });

      const savedResource = await manager.save(resource);

      if (
        !createResourceDto.sharedResourceId &&
        createResourceDto.pins.length > 1
      ) {
        savedResource.resourceMeta.firstResourceId = savedResource.id;
        await manager.save(savedResource.resourceMeta);
      }

      return {
        id: savedResource.id,
        order: savedResource.order,
        data: createdPins,
      };
    });
  }

  async createPinResource(
    collectionId: string,
    createPinResourceDto: CreatePinResourceDto,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager.findOne(CollectionEntity, {
        where: { id: collectionId },
      });

      if (!collection) throw new NotFoundException('Collection not found');

      const lastResource = await manager
        .createQueryBuilder(ResourceEntity, 'resource')
        .select('resource.order')
        .where('resource.collectionId = :collectionId', { collectionId })
        .orderBy('resource.order', 'DESC')
        .limit(1)
        .getRawOne();

      const nextOrder = this.fractionalIndexingService.generateKeyBetween(
        lastResource?.resource_order || null,
        null,
      );

      const resource = manager.create(ResourceEntity, {
        collectionId,
        order: nextOrder,
      });
      const savedResource = await manager.save(resource);

      const variantOrders = createPinResourceDto.variants.map((v) => v.order);
      if (
        !this.fractionalIndexingService.validateOrderSequence(variantOrders)
      ) {
        throw new NotFoundException(
          'Variants have invalid order sequence. Variants must be in correct ascending order.',
        );
      }

      const pinMeta = manager.create(PinMetaEntity, {
        history: [],
      });

      const pin = manager.create(PinEntity, {
        resource: savedResource,
        variants: createPinResourceDto.variants.map((v) =>
          manager.create(VariantEntity, v),
        ),
        pinMeta,
      });

      const savedPin = await manager.save(pin);

      savedPin.pinMeta.firstPinId = savedPin.id;
      await manager.save(savedPin.pinMeta);

      return {
        id: savedResource.id,
        order: savedResource.order,
        data: [savedPin],
      };
    });
  }

  async sharePinResource(
    collectionId: string,
    sharePinResourceDto: SharePinResourceDto,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager.findOne(CollectionEntity, {
        where: { id: collectionId },
      });

      if (!collection) throw new NotFoundException('Collection not found');

      const sharedPin = await manager.findOne(PinEntity, {
        where: { id: sharePinResourceDto.sharedPinId },
        relations: ['pinMeta', 'variants'],
      });

      if (!sharedPin) throw new NotFoundException('Shared pin not found');

      const lastResource = await manager
        .createQueryBuilder(ResourceEntity, 'resource')
        .select('resource.order')
        .where('resource.collectionId = :collectionId', { collectionId })
        .orderBy('resource.order', 'DESC')
        .limit(1)
        .getRawOne();

      const nextOrder = this.fractionalIndexingService.generateKeyBetween(
        lastResource?.resource_order || null,
        null,
      );

      const resource = manager.create(ResourceEntity, {
        collectionId,
        order: nextOrder,
      });
      const savedResource = await manager.save(resource);

      const currentHistory = sharedPin.pinMeta?.history || [];
      const newHistory = this.generateHistory(
        currentHistory,
        sharePinResourceDto.sourceMuralId,
      );

      if (!sharedPin.pinMeta?.firstPinId) {
        throw new NotFoundException(
          'Shared pin has invalid metadata: missing firstPinId',
        );
      }

      const pinMeta = manager.create(PinMetaEntity, {
        firstPinId: sharedPin.pinMeta.firstPinId,
        sharedPinId: sharePinResourceDto.sharedPinId,
        history: newHistory,
      });

      if (sharePinResourceDto.additionalVariants) {
        const variantOrders = sharePinResourceDto.additionalVariants.map(
          (v) => v.order,
        );
        if (
          !this.fractionalIndexingService.validateOrderSequence(variantOrders)
        ) {
          throw new NotFoundException(
            'Additional variants have invalid order sequence. Variants must be in correct ascending order.',
          );
        }
      }

      const variants =
        sharePinResourceDto.additionalVariants?.map((v) =>
          manager.create(VariantEntity, v),
        ) || [];

      const pin = manager.create(PinEntity, {
        resource: savedResource,
        variants,
        pinMeta,
      });

      const savedPin = await manager.save(pin);

      return {
        id: savedResource.id,
        order: savedResource.order,
        data: [savedPin],
      };
    });
  }

  async createPinGroupResource(
    collectionId: string,
    createPinGroupResourceDto: CreatePinGroupResourceDto,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager.findOne(CollectionEntity, {
        where: { id: collectionId },
      });

      if (!collection) throw new NotFoundException('Collection not found');

      const lastResource = await manager
        .createQueryBuilder(ResourceEntity, 'resource')
        .select('resource.order')
        .where('resource.collectionId = :collectionId', { collectionId })
        .orderBy('resource.order', 'DESC')
        .limit(1)
        .getRawOne();

      const nextOrder = this.fractionalIndexingService.generateKeyBetween(
        lastResource?.resource_order || null,
        null,
      );

      const resourceMeta = manager.create(ResourceMetaEntity, {
        groupName: createPinGroupResourceDto.groupName,
        history: [],
      });

      const resource = manager.create(ResourceEntity, {
        collectionId,
        order: nextOrder,
        resourceMeta,
      });
      const savedResource = await manager.save(resource);

      savedResource.resourceMeta.firstResourceId = savedResource.id;
      await manager.save(savedResource.resourceMeta);

      const pinOrders = createPinGroupResourceDto.pins.map((pin) => pin.order);

      if (!this.fractionalIndexingService.validateOrderSequence(pinOrders)) {
        throw new NotFoundException(
          'Pin group has invalid order sequence. Pins must be in correct ascending order.',
        );
      }

      const createdPins: PinEntity[] = [];

      for (const pinDto of createPinGroupResourceDto.pins) {
        if (pinDto.sharedPinId) {
          // shared pins logic
          const sharedPin = await manager.findOne(PinEntity, {
            where: { id: pinDto.sharedPinId },
            relations: ['pinMeta', 'variants'],
          });

          if (!sharedPin) {
            throw new NotFoundException(
              `Shared pin ${pinDto.sharedPinId} not found`,
            );
          }

          if (!sharedPin.pinMeta?.firstPinId) {
            throw new NotFoundException(
              `Shared pin ${pinDto.sharedPinId} has invalid metadata: missing firstPinId`,
            );
          }

          const currentHistory = sharedPin.pinMeta?.history || [];
          const newHistory = this.generateHistory(
            currentHistory,
            pinDto.sourceMuralId || '',
          );

          const pinMeta = manager.create(PinMetaEntity, {
            firstPinId: sharedPin.pinMeta.firstPinId,
            sharedPinId: pinDto.sharedPinId,
            history: newHistory,
          });

          const variantOrders = pinDto.variants.map((v) => v.order);
          if (
            !this.fractionalIndexingService.validateOrderSequence(variantOrders)
          ) {
            throw new NotFoundException(
              `Pin contains variants with invalid order sequence. Variants must be in correct ascending order.`,
            );
          }

          const variants = pinDto.variants.map((v) =>
            manager.create(VariantEntity, v),
          );

          const pin = manager.create(PinEntity, {
            resource: savedResource,
            variants,
            pinMeta,
            order: pinDto.order,
          });

          createdPins.push(await manager.save(pin));
        } else {
          // New pin logic
          const pinMeta = manager.create(PinMetaEntity, {
            history: [],
          });

          const variantOrders = pinDto.variants.map((v) => v.order);
          if (
            !this.fractionalIndexingService.validateOrderSequence(variantOrders)
          ) {
            throw new NotFoundException(
              `Pin contains variants with invalid order sequence. Variants must be in correct ascending order.`,
            );
          }

          const variants = pinDto.variants.map((v) =>
            manager.create(VariantEntity, v),
          );

          const pin = manager.create(PinEntity, {
            resource: savedResource,
            variants,
            pinMeta,
            order: pinDto.order,
          });

          const savedPin = await manager.save(pin);

          savedPin.pinMeta.firstPinId = savedPin.id;
          await manager.save(savedPin.pinMeta);

          createdPins.push(savedPin);
        }
      }

      return {
        id: savedResource.id,
        order: savedResource.order,
        data: createdPins,
      };
    });
  }

  async sharePinGroupResource(
    collectionId: string,
    sharePinGroupResourceDto: SharePinGroupResourceDto,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager.findOne(CollectionEntity, {
        where: { id: collectionId },
      });

      if (!collection) throw new NotFoundException('Collection not found');

      const sharedResource = await manager.findOne(ResourceEntity, {
        where: { id: sharePinGroupResourceDto.sharedResourceId },
        relations: ['resourceMeta', 'pins', 'pins.variants', 'pins.pinMeta'],
      });

      if (!sharedResource) {
        throw new NotFoundException('Shared resource not found');
      }

      if (!sharedResource.resourceMeta?.firstResourceId) {
        throw new NotFoundException(
          'Shared resource has invalid metadata: missing firstResourceId',
        );
      }

      const lastResource = await manager
        .createQueryBuilder(ResourceEntity, 'resource')
        .select('resource.order')
        .where('resource.collectionId = :collectionId', { collectionId })
        .orderBy('resource.order', 'DESC')
        .limit(1)
        .getRawOne();

      const nextOrder = this.fractionalIndexingService.generateKeyBetween(
        lastResource?.resource_order || null,
        null,
      );

      const currentHistory = sharedResource.resourceMeta?.history || [];
      const newHistory = this.generateHistory(
        currentHistory,
        sharePinGroupResourceDto.sourceMuralId,
      );

      const resourceMeta = manager.create(ResourceMetaEntity, {
        firstResourceId: sharedResource.resourceMeta.firstResourceId,
        sharedResourceId: sharePinGroupResourceDto.sharedResourceId,
        groupName: sharedResource.resourceMeta.groupName,
        history: newHistory,
      });

      const resource = manager.create(ResourceEntity, {
        collectionId,
        order: nextOrder,
        resourceMeta,
      });
      const savedResource = await manager.save(resource);

      const createdPins: PinEntity[] = [];

      // Copy pins from shared resource
      for (const sharedPin of sharedResource.pins) {
        if (!sharedPin.pinMeta?.firstPinId) {
          throw new NotFoundException(
            'Shared pin has invalid metadata: missing firstPinId',
          );
        }

        const pinHistory = sharedPin.pinMeta?.history || [];
        const newPinHistory = this.generateHistory(
          pinHistory,
          sharePinGroupResourceDto.sourceMuralId,
        );

        const pinMeta = manager.create(PinMetaEntity, {
          firstPinId: sharedPin.pinMeta.firstPinId,
          sharedPinId: sharedPin.id,
          history: newPinHistory,
        });

        const variantOrders = sharedPin.variants.map((v) => v.order);
        if (
          !this.fractionalIndexingService.validateOrderSequence(variantOrders)
        ) {
          throw new NotFoundException(
            'Shared pin contains variants with invalid order sequence.',
          );
        }

        const variants = sharedPin.variants.map((v) =>
          manager.create(VariantEntity, {
            config: v.config,
            order: v.order,
          }),
        );

        const pin = manager.create(PinEntity, {
          resource: savedResource,
          variants,
          pinMeta,
          order: sharedPin.order,
        });

        createdPins.push(await manager.save(pin));
      }

      if (sharePinGroupResourceDto.additionalPins) {
        const additionalPinOrders = sharePinGroupResourceDto.additionalPins.map(
          (pin) => pin.order,
        );

        if (
          !this.fractionalIndexingService.validateOrderSequence(
            additionalPinOrders,
          )
        ) {
          throw new NotFoundException(
            'Additional pins have invalid order sequence. Pins must be in correct ascending order.',
          );
        }

        for (const pinDto of sharePinGroupResourceDto.additionalPins) {
          if (pinDto.sharedPinId) {
            const sharedPin = await manager.findOne(PinEntity, {
              where: { id: pinDto.sharedPinId },
              relations: ['pinMeta', 'variants'],
            });

            if (!sharedPin) {
              throw new NotFoundException(
                `Shared pin ${pinDto.sharedPinId} not found`,
              );
            }

            if (!sharedPin.pinMeta?.firstPinId) {
              throw new NotFoundException(
                `Shared pin ${pinDto.sharedPinId} has invalid metadata: missing firstPinId`,
              );
            }

            const currentHistory = sharedPin.pinMeta?.history || [];
            const newHistory = this.generateHistory(
              currentHistory,
              pinDto.sourceMuralId || '',
            );

            const pinMeta = manager.create(PinMetaEntity, {
              firstPinId: sharedPin.pinMeta.firstPinId,
              sharedPinId: pinDto.sharedPinId,
              history: newHistory,
            });

            const variantOrders = pinDto.variants.map((v) => v.order);
            if (
              !this.fractionalIndexingService.validateOrderSequence(
                variantOrders,
              )
            ) {
              throw new NotFoundException(
                'Pin contains variants with invalid order sequence.',
              );
            }

            const variants = pinDto.variants.map((v) =>
              manager.create(VariantEntity, v),
            );

            const pin = manager.create(PinEntity, {
              resource: savedResource,
              variants,
              pinMeta,
              order: pinDto.order,
            });

            createdPins.push(await manager.save(pin));
          } else {
            const pinMeta = manager.create(PinMetaEntity, {
              history: [],
            });

            const variantOrders = pinDto.variants.map((v) => v.order);
            if (
              !this.fractionalIndexingService.validateOrderSequence(
                variantOrders,
              )
            ) {
              throw new NotFoundException(
                'Pin contains variants with invalid order sequence.',
              );
            }

            const variants = pinDto.variants.map((v) =>
              manager.create(VariantEntity, v),
            );

            const pin = manager.create(PinEntity, {
              resource: savedResource,
              variants,
              pinMeta,
              order: pinDto.order,
            });

            const savedPin = await manager.save(pin);

            savedPin.pinMeta.firstPinId = savedPin.id;
            await manager.save(savedPin.pinMeta);

            createdPins.push(savedPin);
          }
        }
      }

      return {
        id: savedResource.id,
        order: savedResource.order,
        data: createdPins,
      };
    });
  }

  private generateHistory(
    currentHistory: { sharedMuralId: string; order: number }[],
    sourceMuralId: string,
  ): { sharedMuralId: string; order: number }[] {
    const maxOrder = currentHistory.reduce(
      (max, item) => (item.order > max ? item.order : max),
      0,
    );

    const newHistoryItem = {
      sharedMuralId: sourceMuralId,
      order: maxOrder + 1,
    };

    let newHistory = [...currentHistory, newHistoryItem];

    if (newHistory.length > 5) {
      const minOrder = newHistory.reduce(
        (min, item) => (item.order < min ? item.order : min),
        Infinity,
      );
      newHistory = newHistory.filter((item) => item.order !== minOrder);
    }

    return newHistory;
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
      relations: ['pins'],
    });

    if (!resource || !resource.pins || resource.pins.length === 0) {
      throw new NotFoundException('Pin Resource not found');
    }

    // Assuming we are updating the first pin for now, or we need to know which pin to update.
    // The UpdatePinDto usually targets a specific pin ID, but here we are updating via resourceId.
    // If resource has multiple pins, this endpoint is ambiguous.
    // However, for now, let's assume single pin update or the user will provide pinId in the future.
    // But wait, the previous logic was resource.pin.id.
    // If we have multiple pins, which one?
    // Let's assume the first one for backward compatibility or throw error if multiple?
    // The user said "resource contém pins".
    // If I update a resource, do I update all pins? No.
    // The endpoint is `updatePinResource(resourceId, dto)`.
    // It seems it was designed for 1-to-1.
    // I will use the first pin for now and add a TODO.
    const pinToUpdate = resource.pins[0];
    return await this.pinsService.update(pinToUpdate.id, updatePinDto);
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
      .leftJoinAndSelect('resource.pins', 'pin')
      .leftJoinAndSelect('pin.variants', 'variants')
      .where('resource.id = :resourceId', { resourceId })
      .andWhere('resource.status = :status', { status: 'active' })
      .getOne();

    if (!resource) throw new NotFoundException('Resource not found');
    return resource;
  }
}
