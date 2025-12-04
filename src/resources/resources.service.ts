import {
  Logger,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ResourceEntity } from './entities/resource.entity';
import { ResourceMetaEntity } from './entities/resource-meta.entity';
import { PinsService } from 'src/pins/pins.service';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { FractionalIndexingService } from 'src/common/services/fractional-indexing.service';
import { PaginationQueryDto } from 'src/common/dto/pagination/pagination-query.dto';
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
import { ResourceDto } from './dto/resource.dto';
import { CreateVariantDto } from 'src/pins/dto/variant/create-variant.dto';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { PlansService } from 'src/plans/plans.service';

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourcesRepository: Repository<ResourceEntity>,
    private readonly pinsService: PinsService,
    private readonly fractionalIndexingService: FractionalIndexingService,
    private readonly dataSource: DataSource,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly plansService: PlansService,
  ) {}

  async findResources(
    collectionId: string,
    paginationQueryDto: PaginationQueryDto,
  ): Promise<PaginatedResourcesResponseDto> {
    const { page = 1, limit = 5 } = paginationQueryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.resourcesRepository
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.resourceMeta', 'resourceMeta')
      .where('resource.collectionId = :collectionId', { collectionId })
      .andWhere('resource.status = :status', { status: 'active' })
      .orderBy('resource.order', 'ASC')
      .skip(skip)
      .take(limit);

    const [resources, total] = await queryBuilder.getManyAndCount();

    const resourceIds = resources.map((r) => r.id);
    const pinsByResource =
      await this.pinsService.findBatchPreviews(resourceIds);

    const transformedResources = resources.map((resource) => ({
      id: resource.id,
      order: resource.order,
      pins: pinsByResource.get(resource.id) || [],
      meta: resource.resourceMeta
        ? {
            sharedResourceId: resource.resourceMeta.sharedResourceId,
            firstResourceId: resource.resourceMeta.firstResourceId,
            groupName: resource.resourceMeta.groupName,
            history: resource.resourceMeta.history,
          }
        : undefined,
    }));

    return {
      resources: transformedResources,
      pagination: {
        currentPage: page,
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async findResource(resourceId: string): Promise<ResourceDto> {
    const resource = await this.resourcesRepository
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.resourceMeta', 'resourceMeta')
      .where('resource.id = :resourceId', { resourceId })
      .andWhere('resource.status = :status', { status: 'active' })
      .getOne();

    if (!resource) throw new NotFoundException('Resource not found');

    const pinsByResource = await this.pinsService.findBatchPreviews([
      resource.id,
    ]);

    return {
      id: resource.id,
      order: resource.order,
      pins: pinsByResource.get(resource.id) || [],
      meta: resource.resourceMeta
        ? {
            sharedResourceId: resource.resourceMeta.sharedResourceId,
            firstResourceId: resource.resourceMeta.firstResourceId,
            groupName: resource.resourceMeta.groupName,
            history: resource.resourceMeta.history,
          }
        : undefined,
    };
  }

  async createPinResource(
    collectionId: string,
    createPinResourceDto: CreatePinResourceDto,
  ): Promise<ResourceDto> {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager.findOne(CollectionEntity, {
        where: { id: collectionId },
        relations: ['mural'],
      });

      if (!collection) throw new NotFoundException('Collection not found');

      const variantOrders = createPinResourceDto.variants.map((v) => v.order);
      if (
        !this.fractionalIndexingService.validateOrderSequence(variantOrders)
      ) {
        throw new NotFoundException(
          'Variants have invalid order sequence. Variants must be in correct ascending order.',
        );
      }

      await this.subscriptionsService.validateSubscriptionLimits(
        collection.mural.userId,
        'variants_per_pin',
        createPinResourceDto.variants.length,
      );

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

      const pinMeta = manager.create(PinMetaEntity);

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
        pins: [this.mapPinToDto(savedPin)],
      };
    });
  }

  async createPinGroupResource(
    collectionId: string,
    createPinGroupResourceDto: CreatePinGroupResourceDto,
  ): Promise<ResourceDto> {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager.findOne(CollectionEntity, {
        where: { id: collectionId },
        relations: ['mural'],
      });

      if (!collection) throw new NotFoundException('Collection not found');

      await this.subscriptionsService.validateSubscriptionLimits(
        collection.mural.userId,
        'pins_per_group',
        createPinGroupResourceDto.pins.length,
      );

      const pinOrders = createPinGroupResourceDto.pins.map((pin) => pin.order);

      if (!this.fractionalIndexingService.validateOrderSequence(pinOrders)) {
        throw new NotFoundException(
          'Pin group has invalid order sequence. Pins must be in correct ascending order.',
        );
      }

      const sharedPinsMap = new Map<string, PinEntity>();

      for (const pinDto of createPinGroupResourceDto.pins) {
        if (this.isSharePinDto(pinDto)) {
          const sharedPin = await manager.findOne(PinEntity, {
            where: { id: pinDto.sharedPinId },
            relations: [
              'pinMeta',
              'variants',
              'resource',
              'resource.collection',
            ],
          });

          if (!sharedPin) {
            throw new NotFoundException(
              `Shared pin ${pinDto.sharedPinId} not found`,
            );
          }

          if (
            !sharedPin.resource?.collection?.muralId ||
            sharedPin.resource.collection.muralId !==
              (pinDto.sourceMuralId || '')
          ) {
            throw new NotFoundException(
              `Shared pin ${pinDto.sharedPinId} does not belong to the specified source mural`,
            );
          }

          if (!sharedPin.pinMeta?.firstPinId) {
            throw new NotFoundException(
              `Shared pin ${pinDto.sharedPinId} has invalid metadata: missing firstPinId`,
            );
          }

          if (
            pinDto.additionalVariants &&
            pinDto.additionalVariants.length > 0
          ) {
            const variantOrders = pinDto.additionalVariants.map(
              (v: CreateVariantDto) => v.order,
            );
            if (
              !this.fractionalIndexingService.validateOrderSequence(
                variantOrders,
              )
            ) {
              throw new NotFoundException(
                `Pin contains variants with invalid order sequence. Variants must be in correct ascending order.`,
              );
            }

            await this.subscriptionsService.validateSubscriptionLimits(
              collection.mural.userId,
              'overlapping_variants',
              pinDto.additionalVariants.length,
            );
          }

          sharedPinsMap.set(pinDto.sharedPinId, sharedPin);
        } else {
          // New Pin Validation
          if (pinDto.variants && pinDto.variants.length > 0) {
            const variantOrders = pinDto.variants.map(
              (v: CreateVariantDto) => v.order,
            );
            if (
              !this.fractionalIndexingService.validateOrderSequence(
                variantOrders,
              )
            ) {
              throw new NotFoundException(
                `Pin contains variants with invalid order sequence. Variants must be in correct ascending order.`,
              );
            }

            await this.subscriptionsService.validateSubscriptionLimits(
              collection.mural.userId,
              'variants_per_pin',
              pinDto.variants.length,
            );
          }
        }
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

      const resourceMeta = manager.create(ResourceMetaEntity, {
        groupName: createPinGroupResourceDto.groupName,
      });

      const resource = manager.create(ResourceEntity, {
        collectionId,
        order: nextOrder,
        resourceMeta,
      });
      const savedResource = await manager.save(resource);

      savedResource.resourceMeta.firstResourceId = savedResource.id;
      await manager.save(savedResource.resourceMeta);

      const createdPins: PinEntity[] = [];

      for (const pinDto of createPinGroupResourceDto.pins) {
        if (this.isSharePinDto(pinDto)) {
          const sharedPin = sharedPinsMap.get(pinDto.sharedPinId);
          if (!sharedPin || !sharedPin.pinMeta) {
            throw new InternalServerErrorException(
              'Shared pin not found in pre-validation map',
            );
          }

          const currentHistory = sharedPin.pinMeta.history || [];
          const newHistory = this.generateHistory(
            currentHistory,
            pinDto.sourceMuralId || '',
          );

          const pinMeta = manager.create(PinMetaEntity, {
            firstPinId: sharedPin.pinMeta.firstPinId,
            sharedPinId: pinDto.sharedPinId,
            history: newHistory,
          });

          const variants = pinDto.additionalVariants
            ? pinDto.additionalVariants.map((v: CreateVariantDto) =>
                manager.create(VariantEntity, v),
              )
            : [];

          const pin = manager.create(PinEntity, {
            resource: savedResource,
            variants,
            pinMeta,
            order: pinDto.order,
          });

          createdPins.push(await manager.save(pin));
        } else {
          const pinMeta = manager.create(PinMetaEntity);

          const variants = pinDto.variants.map((v: CreateVariantDto) =>
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
        pins: createdPins.map((pin) => this.mapPinToDto(pin)),
      };
    });
  }

  async sharePinResource(
    collectionId: string,
    sharePinResourceDto: SharePinResourceDto,
  ): Promise<ResourceDto> {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager.findOne(CollectionEntity, {
        where: { id: collectionId },
        relations: ['mural'],
      });

      if (!collection) throw new NotFoundException('Collection not found');

      const sharedPin = await manager.findOne(PinEntity, {
        where: { id: sharePinResourceDto.sharedPinId },
        relations: ['pinMeta', 'resource', 'resource.collection'],
      });

      if (!sharedPin) throw new NotFoundException('Shared pin not found');

      if (!sharedPin.pinMeta?.firstPinId) {
        throw new NotFoundException(
          'Shared pin has invalid metadata: missing firstPinId',
        );
      }

      if (
        !sharedPin.resource?.collection?.muralId ||
        sharedPin.resource.collection.muralId !==
          sharePinResourceDto.sourceMuralId
      ) {
        throw new NotFoundException(
          'Shared pin does not belong to the specified source mural',
        );
      }

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

        await this.subscriptionsService.validateSubscriptionLimits(
          collection.mural.userId,
          'overlapping_variants',
          sharePinResourceDto.additionalVariants.length,
        );
      }

      const currentHistory = sharedPin.pinMeta?.history || [];
      await this.subscriptionsService.validateSubscriptionLimits(
        collection.mural.userId,
        'own_mural_share_sequence',
        0, // Not used for this validation type
        {
          history: currentHistory,
          currentMuralId: collection.muralId,
        },
      );

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

      const newHistory = this.generateHistory(
        currentHistory,
        sharePinResourceDto.sourceMuralId,
      );

      const pinMeta = manager.create(PinMetaEntity, {
        firstPinId: sharedPin.pinMeta.firstPinId,
        sharedPinId: sharePinResourceDto.sharedPinId,
        history: newHistory,
      });

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
        pins: [this.mapPinToDto(savedPin)],
      };
    });
  }

  async sharePinGroupResource(
    collectionId: string,
    sharePinGroupResourceDto: SharePinGroupResourceDto,
  ): Promise<ResourceDto> {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager.findOne(CollectionEntity, {
        where: { id: collectionId },
        relations: ['mural'],
      });

      if (!collection) throw new NotFoundException('Collection not found');

      const sharedResource = await manager.findOne(ResourceEntity, {
        where: { id: sharePinGroupResourceDto.sharedResourceId },
        relations: ['resourceMeta', 'collection'],
      });

      if (!sharedResource) {
        throw new NotFoundException('Shared resource not found');
      }

      if (
        !sharedResource.collection?.muralId ||
        sharedResource.collection.muralId !==
          sharePinGroupResourceDto.sourceMuralId
      ) {
        throw new NotFoundException(
          'Shared resource does not belong to the specified source mural',
        );
      }

      if (!sharedResource.resourceMeta?.firstResourceId) {
        throw new NotFoundException(
          'Shared resource has invalid metadata: missing firstResourceId',
        );
      }

      const resourceHistory = sharedResource.resourceMeta?.history || [];
      await this.subscriptionsService.validateSubscriptionLimits(
        collection.mural.userId,
        'own_mural_share_sequence',
        0,
        {
          history: resourceHistory,
          currentMuralId: collection.muralId,
        },
      );

      // Validate and pre-fetch all shared pins if additionalPins exist
      const sharedPinsMap = new Map<string, PinEntity>();

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

        await this.subscriptionsService.validateSubscriptionLimits(
          collection.mural.userId,
          'overlapping_pins',
          sharePinGroupResourceDto.additionalPins.length,
        );

        for (const pinDto of sharePinGroupResourceDto.additionalPins) {
          if (this.isSharePinDto(pinDto)) {
            const sharedPin = await manager.findOne(PinEntity, {
              where: { id: pinDto.sharedPinId },
              relations: ['pinMeta', 'resource', 'resource.collection'],
            });

            if (!sharedPin) {
              throw new NotFoundException(
                `Shared pin ${pinDto.sharedPinId} not found`,
              );
            }

            if (
              !sharedPin.resource?.collection?.muralId ||
              sharedPin.resource.collection.muralId !==
                (pinDto.sourceMuralId || '')
            ) {
              throw new NotFoundException(
                `Shared pin ${pinDto.sharedPinId} does not belong to the specified source mural`,
              );
            }

            if (!sharedPin.pinMeta?.firstPinId) {
              throw new NotFoundException(
                `Shared pin ${pinDto.sharedPinId} has invalid metadata: missing firstPinId`,
              );
            }

            if (
              pinDto.additionalVariants &&
              pinDto.additionalVariants.length > 0
            ) {
              const variantOrders = pinDto.additionalVariants.map(
                (v: CreateVariantDto) => v.order,
              );
              if (
                !this.fractionalIndexingService.validateOrderSequence(
                  variantOrders,
                )
              ) {
                throw new NotFoundException(
                  'Pin contains variants with invalid order sequence.',
                );
              }

              await this.subscriptionsService.validateSubscriptionLimits(
                collection.mural.userId,
                'overlapping_variants',
                pinDto.additionalVariants.length,
              );
            }

            sharedPinsMap.set(pinDto.sharedPinId, sharedPin);
          } else {
            if (pinDto.variants && pinDto.variants.length > 0) {
              const variantOrders = pinDto.variants.map(
                (v: CreateVariantDto) => v.order,
              );
              if (
                !this.fractionalIndexingService.validateOrderSequence(
                  variantOrders,
                )
              ) {
                throw new NotFoundException(
                  'Pin contains variants with invalid order sequence.',
                );
              }

              await this.subscriptionsService.validateSubscriptionLimits(
                collection.mural.userId,
                'variants_per_pin',
                pinDto.variants.length,
              );
            }
          }
        }
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

      if (sharePinGroupResourceDto.additionalPins) {
        for (const pinDto of sharePinGroupResourceDto.additionalPins) {
          if (this.isSharePinDto(pinDto)) {
            const sharedPin = sharedPinsMap.get(pinDto.sharedPinId);
            if (!sharedPin || !sharedPin.pinMeta) {
              throw new InternalServerErrorException(
                'Shared pin not found in pre-validation map',
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

            const variants = pinDto.additionalVariants
              ? pinDto.additionalVariants.map((v: CreateVariantDto) =>
                  manager.create(VariantEntity, v),
                )
              : [];

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

            const variants = pinDto.variants.map((v: CreateVariantDto) =>
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
        pins: createdPins.map((pin) => this.mapPinToDto(pin)),
      };
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
      relations: ['pins'],
    });

    if (!resource || !resource.pins || resource.pins.length === 0) {
      throw new NotFoundException('Pin Resource not found');
    }

    const pinToUpdate = resource.pins[0];
    return await this.pinsService.update(pinToUpdate.id, updatePinDto);
  }

  async reorder(entityId: string, reorderDto: ReorderDto) {
    return await this.dataSource.transaction(async (manager) => {
      const { type, newOrder, previousId, nextId } = reorderDto;

      if (!this.fractionalIndexingService.validateOrder(newOrder)) {
        throw new NotFoundException(
          'Invalid order value. Must be a valid fractional index.',
        );
      }

      switch (type) {
        case 'resource': {
          const resource = await manager.findOne(ResourceEntity, {
            where: { id: entityId },
          });

          if (!resource) {
            throw new NotFoundException('Resource not found');
          }

          const collision = await manager.findOne(ResourceEntity, {
            where: {
              collectionId: resource.collectionId,
              order: newOrder,
            },
          });

          if (collision && collision.id !== entityId) {
            throw new NotFoundException(
              'Order collision detected. Another resource already has this order value.',
            );
          }

          if (previousId || nextId) {
            if (previousId) {
              const previous = await manager.findOne(ResourceEntity, {
                where: { id: previousId },
              });

              if (!previous) {
                throw new NotFoundException('Previous resource not found');
              }

              if (previous.collectionId !== resource.collectionId) {
                throw new NotFoundException(
                  'Previous resource is not in the same collection',
                );
              }

              if (
                this.fractionalIndexingService.compareOrder(
                  newOrder,
                  previous.order,
                ) <= 0
              ) {
                throw new NotFoundException(
                  'New order must be greater than previous resource order',
                );
              }
            }

            if (nextId) {
              const next = await manager.findOne(ResourceEntity, {
                where: { id: nextId },
              });

              if (!next) {
                throw new NotFoundException('Next resource not found');
              }

              if (next.collectionId !== resource.collectionId) {
                throw new NotFoundException(
                  'Next resource is not in the same collection',
                );
              }

              if (
                this.fractionalIndexingService.compareOrder(
                  newOrder,
                  next.order,
                ) >= 0
              ) {
                throw new NotFoundException(
                  'New order must be less than next resource order',
                );
              }
            }
          }

          resource.order = newOrder;
          await manager.save(resource);

          return { message: 'Resource reordered successfully' };
        }

        case 'pin': {
          const pin = await manager.findOne(PinEntity, {
            where: { id: entityId },
          });

          if (!pin) {
            throw new NotFoundException('Pin not found');
          }

          const collision = await manager.findOne(PinEntity, {
            where: {
              resourceId: pin.resourceId,
              order: newOrder,
            },
          });

          if (collision && collision.id !== entityId) {
            throw new NotFoundException(
              'Order collision detected. Another pin already has this order value.',
            );
          }

          if (previousId || nextId) {
            if (previousId) {
              const previous = await manager.findOne(PinEntity, {
                where: { id: previousId },
              });

              if (!previous) {
                throw new NotFoundException('Previous pin not found');
              }

              if (previous.resourceId !== pin.resourceId) {
                throw new NotFoundException(
                  'Previous pin is not in the same resource',
                );
              }

              if (
                this.fractionalIndexingService.compareOrder(
                  newOrder,
                  previous.order,
                ) <= 0
              ) {
                throw new NotFoundException(
                  'New order must be greater than previous pin order',
                );
              }
            }

            if (nextId) {
              const next = await manager.findOne(PinEntity, {
                where: { id: nextId },
              });

              if (!next) {
                throw new NotFoundException('Next pin not found');
              }

              if (next.resourceId !== pin.resourceId) {
                throw new NotFoundException(
                  'Next pin is not in the same resource',
                );
              }

              if (
                this.fractionalIndexingService.compareOrder(
                  newOrder,
                  next.order,
                ) >= 0
              ) {
                throw new NotFoundException(
                  'New order must be less than next pin order',
                );
              }
            }
          }

          pin.order = newOrder;
          await manager.save(pin);

          return { message: 'Pin reordered successfully' };
        }

        case 'variant': {
          const variant = await manager.findOne(VariantEntity, {
            where: { id: entityId },
          });

          if (!variant) {
            throw new NotFoundException('Variant not found');
          }

          const collision = await manager.findOne(VariantEntity, {
            where: {
              pinId: variant.pinId,
              order: newOrder,
            },
          });

          if (collision && collision.id !== entityId) {
            throw new NotFoundException(
              'Order collision detected. Another variant already has this order value.',
            );
          }

          if (previousId || nextId) {
            if (previousId) {
              const previous = await manager.findOne(VariantEntity, {
                where: { id: previousId },
              });

              if (!previous) {
                throw new NotFoundException('Previous variant not found');
              }

              if (previous.pinId !== variant.pinId) {
                throw new NotFoundException(
                  'Previous variant is not in the same pin',
                );
              }

              if (
                this.fractionalIndexingService.compareOrder(
                  newOrder,
                  previous.order,
                ) <= 0
              ) {
                throw new NotFoundException(
                  'New order must be greater than previous variant order',
                );
              }
            }

            if (nextId) {
              const next = await manager.findOne(VariantEntity, {
                where: { id: nextId },
              });

              if (!next) {
                throw new NotFoundException('Next variant not found');
              }

              if (next.pinId !== variant.pinId) {
                throw new NotFoundException(
                  'Next variant is not in the same pin',
                );
              }

              if (
                this.fractionalIndexingService.compareOrder(
                  newOrder,
                  next.order,
                ) >= 0
              ) {
                throw new NotFoundException(
                  'New order must be less than next variant order',
                );
              }
            }
          }

          variant.order = newOrder;
          await manager.save(variant);

          return { message: 'Variant reordered successfully' };
        }

        default: {
          throw new NotFoundException(`Invalid reorder type: ${type}`);
        }
      }
    });
  }

  private generateHistory(
    currentHistory: { sourceMuralId: string; order: number }[],
    sourceMuralId: string,
  ): { sourceMuralId: string; order: number }[] {
    const maxOrder = currentHistory.reduce(
      (max, item) => (item.order > max ? item.order : max),
      0,
    );

    const newHistoryItem = {
      sourceMuralId: sourceMuralId,
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

  private mapPinToDto(pin: PinEntity) {
    return {
      id: pin.id,
      order: pin.order,
      variants: pin.variants.map((variant) => ({
        id: variant.id,
        order: variant.order,
        config: variant.config,
      })),
    };
  }

  private isSharePinDto(pin: any): pin is {
    sharedPinId: string;
    sourceMuralId: string;
    additionalVariants?: any[];
    order?: string;
  } {
    return 'sharedPinId' in pin && pin.sharedPinId !== undefined;
  }
}
