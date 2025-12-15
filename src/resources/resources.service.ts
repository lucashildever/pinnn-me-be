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
import { ReorderResourceDto } from './dto/reorder-resource.dto';
import { CreatePinResourceDto } from './dto/create-pin-resource.dto';
import { SharePinResourceDto } from './dto/share-pin-resource.dto';
import { CreatePinGroupResourceDto } from './dto/create-pin-group-resource.dto';
import { SharePinGroupResourceDto } from './dto/share-pin-group-resource.dto';
import { GroupPinsDto } from './dto/group-pins.dto';
import { PinEntity } from 'src/pins/entities/pin.entity';
import { PinMetaEntity } from 'src/pins/entities/pin-meta.entity';
import { VariantEntity } from 'src/pins/entities/variant.entity';
import { ResourceDto } from './dto/resource.dto';
import { CreateVariantDto } from 'src/pins/dto/variant/create-variant.dto';
import { PinDto } from 'src/pins/dto/pin.dto';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { PlansService } from 'src/plans/plans.service';
import { DEFAULT_ITEMS_LIMIT } from 'src/common/constants/pagination.constants';

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
      .orderBy('resource.order', 'DESC')
      .skip(skip)
      .take(limit);

    const [resources, total] = await queryBuilder.getManyAndCount();

    const resourceIds = resources.map((r) => r.id);
    const [pinsByResource, pinCounts] = await Promise.all([
      this.pinsService.findBatchPreviews(resourceIds),
      this.pinsService.getPinCountsByResourceIds(resourceIds),
    ]);

    const transformedResources = await Promise.all(
      resources.map(async (resource) => {
        const pins = pinsByResource.get(resource.id) || [];
        const totalPins = pinCounts.get(resource.id) || pins.length;
        const meta = resource.resourceMeta
          ? {
              sharedResourceId: resource.resourceMeta.sharedResourceId,
              firstResourceId: resource.resourceMeta.firstResourceId,
              groupName: resource.resourceMeta.groupName,
              inheritedPinsTotal: resource.resourceMeta.inheritedPinsTotal,
              history: resource.resourceMeta.history,
            }
          : undefined;

        // Apply enrichment
        const { pins: enrichedPins, fromShared } =
          await this.enrichResourceWithSharedPins({ meta }, pins);

        return {
          id: resource.id,
          order: resource.order,
          type: this.defineResourceType(meta, pins),
          pins: {
            data: enrichedPins,
            pagination: {
              currentPage: 1,
              totalItems: totalPins,
              itemsPerPage: DEFAULT_ITEMS_LIMIT,
            },
          },
          ...(fromShared ? { fromShared } : {}),
          meta,
        };
      }),
    );

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
      .getOne();

    if (!resource) throw new NotFoundException('Resource not found');

    const [pinsByResource, totalPins] = await Promise.all([
      this.pinsService.findBatchPreviews([resource.id]),
      this.pinsService.getPinCountByResourceId(resource.id),
    ]);

    const pins = pinsByResource.get(resource.id) || [];
    const meta = resource.resourceMeta
      ? {
          sharedResourceId: resource.resourceMeta.sharedResourceId,
          firstResourceId: resource.resourceMeta.firstResourceId,
          groupName: resource.resourceMeta.groupName,
          inheritedPinsTotal: resource.resourceMeta.inheritedPinsTotal,
          history: resource.resourceMeta.history,
        }
      : undefined;

    const { pins: enrichedPins, fromShared } =
      await this.enrichResourceWithSharedPins({ meta }, pins);

    return {
      id: resource.id,
      order: resource.order,
      type: this.defineResourceType(meta, pins),
      pins: {
        data: enrichedPins,
        pagination: {
          currentPage: 1,
          totalItems: totalPins,
          itemsPerPage: DEFAULT_ITEMS_LIMIT,
        },
      },
      ...(fromShared ? { fromShared } : {}),
      meta,
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
        type: 'pin',
        pins: {
          data: [this.mapPinToDto(savedPin)],
          pagination: {
            currentPage: 1,
            totalItems: 1,
            itemsPerPage: DEFAULT_ITEMS_LIMIT,
          },
        },
      };
    });
  }

  /*
   * Creates new Pins/SharedPins grouped into a single resource.
   */
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
      // Prepare pins with fromShared logic for shared pins
      const pinsWithFromShared = await Promise.all(
        createdPins.slice(0, DEFAULT_ITEMS_LIMIT).map(async (pin) => {
          const baseDto = this.mapPinToDto(pin);
          return this.enrichPinWithSharedData(baseDto);
        }),
      );

      const totalPins = createdPins.length;

      return {
        id: savedResource.id,
        order: savedResource.order,
        type: 'pin-group',
        pins: {
          data: pinsWithFromShared,
          pagination: {
            currentPage: 1,
            totalItems: totalPins,
            itemsPerPage: DEFAULT_ITEMS_LIMIT,
          },
        },
        meta: {
          groupName: savedResource.resourceMeta.groupName,
          firstResourceId: savedResource.resourceMeta.firstResourceId,
          history: savedResource.resourceMeta.history,
          sharedResourceId: savedResource.resourceMeta.sharedResourceId,
        },
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
        relations: ['pinMeta', 'variants', 'resource', 'resource.collection'],
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

      // Calculate inherited variants total (snapshot)
      // = sharedPin's own variants + sharedPin's inherited variants
      const sharedPinOwnVariants = sharedPin.variants?.length || 0;
      const sharedPinInherited = sharedPin.pinMeta?.inheritedVariantsTotal || 0;
      const inheritedVariantsTotal = sharedPinOwnVariants + sharedPinInherited;

      const pinMeta = manager.create(PinMetaEntity, {
        firstPinId: sharedPin.pinMeta.firstPinId,
        sharedPinId: sharePinResourceDto.sharedPinId,
        inheritedVariantsTotal,
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

      const basePinDto = this.mapPinToDto(savedPin);
      const enrichedPin = await this.enrichPinWithSharedData(basePinDto);

      return {
        id: savedResource.id,
        order: savedResource.order,
        type: 'shared-pin',
        pins: {
          data: [enrichedPin],
          pagination: {
            currentPage: 1,
            totalItems: 1,
            itemsPerPage: DEFAULT_ITEMS_LIMIT,
          },
        },
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
        relations: ['resourceMeta', 'pins', 'collection'],
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

      // Calculate inherited pins total (snapshot)
      // = sharedResource's own pins + sharedResource's inherited pins
      const sharedResourceOwnPins = sharedResource.pins?.length || 0;
      const sharedResourceInherited =
        sharedResource.resourceMeta?.inheritedPinsTotal || 0;
      const inheritedPinsTotal =
        sharedResourceOwnPins + sharedResourceInherited;

      const resourceMeta = manager.create(ResourceMetaEntity, {
        firstResourceId: sharedResource.resourceMeta.firstResourceId,
        sharedResourceId: sharePinGroupResourceDto.sharedResourceId,
        groupName: sharedResource.resourceMeta.groupName,
        inheritedPinsTotal,
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
      // Prepare pins with fromShared logic for shared pins
      // We first map to DTO and enrich individual pins (variants level)
      const initialPins = createdPins
        .slice(0, DEFAULT_ITEMS_LIMIT)
        .map((pin) => this.mapPinToDto(pin));

      const meta = {
        groupName: savedResource.resourceMeta.groupName,
        firstResourceId: savedResource.resourceMeta.firstResourceId,
        inheritedPinsTotal: savedResource.resourceMeta.inheritedPinsTotal,
        history: savedResource.resourceMeta.history,
        sharedResourceId: savedResource.resourceMeta.sharedResourceId,
      };

      const { pins: enrichedPins, fromShared } =
        await this.enrichResourceWithSharedPins({ meta }, initialPins);

      const ownPinsCount = createdPins.length;

      return {
        id: savedResource.id,
        order: savedResource.order,
        type: 'shared-pin-group',
        pins: {
          data: enrichedPins,
          pagination: {
            currentPage: 1,
            totalItems: ownPinsCount,
            itemsPerPage: DEFAULT_ITEMS_LIMIT,
          },
        },
        ...(fromShared ? { fromShared } : {}),
        meta,
      };
    });
  }

  async delete(resourceId: string) {
    const resource = await this.resourcesRepository.findOne({
      where: { id: resourceId },
    });

    if (!resource) throw new NotFoundException('Resource not found');

    await this.resourcesRepository.remove(resource);

    return { message: `Resource ${resourceId} successfully deleted` };
  }

  async reorder(entityId: string, reorderDto: ReorderResourceDto) {
    return await this.dataSource.transaction(async (manager) => {
      const { newOrder, previousId, nextId } = reorderDto;

      if (!this.fractionalIndexingService.validateOrder(newOrder)) {
        throw new NotFoundException(
          'Invalid order value. Must be a valid fractional index.',
        );
      }

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
            this.fractionalIndexingService.compareOrder(newOrder, next.order) >=
            0
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
    });
  }

  /*
   * Creates a pinGroup from existing pins/sharedPins.
   */
  async groupPinResources(
    collectionId: string,
    groupPinsDto: GroupPinsDto,
  ): Promise<ResourceDto> {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager.findOne(CollectionEntity, {
        where: { id: collectionId },
        relations: ['mural'],
      });

      if (!collection) throw new NotFoundException('Collection not found');

      const resources = await Promise.all(
        groupPinsDto.resourceIds.map(async (resourceId) => {
          const resource = await manager.findOne(ResourceEntity, {
            where: { id: resourceId },
            relations: [
              'pins',
              'pins.pinMeta',
              'pins.variants',
              'resourceMeta',
            ],
          });
          return resource;
        }),
      );

      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        if (!resource) {
          throw new NotFoundException(
            `Resource ${groupPinsDto.resourceIds[i]} not found`,
          );
        }

        if (resource.collectionId !== collectionId) {
          throw new NotFoundException(
            `Resource ${resource.id} does not belong to this collection`,
          );
        }
        // Validate it's a single-pin resource (not a group) - PinResources don't have resourceMeta
        if (resource.resourceMeta) {
          throw new NotFoundException(
            `Resource ${resource.id} is already a group and cannot be grouped`,
          );
        }
        if (!resource.pins || resource.pins.length !== 1) {
          throw new NotFoundException(
            `Resource ${resource.id} must have exactly one pin to be grouped`,
          );
        }
      }

      await this.subscriptionsService.validateSubscriptionLimits(
        collection.mural.userId,
        'pins_per_group',
        resources.length,
      );

      const sortedResources = [...resources].sort((a, b) =>
        this.fractionalIndexingService.compareOrder(a!.order, b!.order),
      );
      const minOrder = sortedResources[0]!.order;

      const resourceMeta = manager.create(ResourceMetaEntity, {
        groupName: groupPinsDto.groupName || null,
      });

      const newResource = manager.create(ResourceEntity, {
        collectionId,
        order: minOrder,
        resourceMeta,
      });
      const savedResource = await manager.save(newResource);

      savedResource.resourceMeta.firstResourceId = savedResource.id;
      await manager.save(savedResource.resourceMeta);

      // Update all pins to reference the new resource and assign orders
      const createdPins: PinEntity[] = [];
      for (let i = 0; i < sortedResources.length; i++) {
        const resource = sortedResources[i]!;
        const pin = resource.pins[0];

        const pinOrder = this.fractionalIndexingService.generateKeyBetween(
          i > 0 ? createdPins[i - 1].order : null,
          null,
        );

        pin.resourceId = savedResource.id;
        pin.resource = savedResource;
        pin.order = pinOrder;
        await manager.save(pin);
        createdPins.push(pin);

        await manager.remove(resource);
      }

      const pinsWithFromShared = await Promise.all(
        createdPins.slice(0, DEFAULT_ITEMS_LIMIT).map(async (pin) => {
          const baseDto = this.mapPinToDto(pin);
          return this.enrichPinWithSharedData(baseDto);
        }),
      );

      return {
        id: savedResource.id,
        order: savedResource.order,
        type: 'pin-group',
        pins: {
          data: pinsWithFromShared,
          pagination: {
            currentPage: 1,
            totalItems: createdPins.length,
            itemsPerPage: DEFAULT_ITEMS_LIMIT,
          },
        },
        meta: {
          groupName: savedResource.resourceMeta.groupName,
          firstResourceId: savedResource.resourceMeta.firstResourceId,
          history: savedResource.resourceMeta.history,
          sharedResourceId: savedResource.resourceMeta.sharedResourceId,
        },
      };
    });
  }

  async ungroupPinResources(resourceId: string): Promise<ResourceDto[]> {
    return await this.dataSource.transaction(async (manager) => {
      const resource = await manager.findOne(ResourceEntity, {
        where: { id: resourceId },
        relations: [
          'resourceMeta',
          'pins',
          'pins.pinMeta',
          'pins.variants',
          'collection',
          'collection.mural',
        ],
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      if (!resource.resourceMeta) {
        throw new NotFoundException(
          'Resource is not a group and cannot be ungrouped',
        );
      }

      const isSharedPinGroup = !!resource.resourceMeta.sharedResourceId;
      const pinsToUngroup = resource.pins || [];

      if (isSharedPinGroup && pinsToUngroup.length === 0) {
        await manager.remove(resource);
        return [];
      }

      if (!isSharedPinGroup && pinsToUngroup.length === 0) {
        await manager.remove(resource);
        return [];
      }

      const sortedPins = [...pinsToUngroup].sort((a, b) =>
        this.fractionalIndexingService.compareOrder(
          a.order || 'a0',
          b.order || 'a0',
        ),
      );

      const prevResource = await manager
        .createQueryBuilder(ResourceEntity, 'resource')
        .where('resource.collectionId = :collectionId', {
          collectionId: resource.collectionId,
        })

        .andWhere('resource.order < :order', { order: resource.order })
        .orderBy('resource.order', 'DESC')
        .getOne();

      const nextResource = await manager
        .createQueryBuilder(ResourceEntity, 'resource')
        .where('resource.collectionId = :collectionId', {
          collectionId: resource.collectionId,
        })
        .andWhere('resource.order > :order', { order: resource.order })
        .orderBy('resource.order', 'ASC')
        .getOne();

      // Generate evenly-spaced orders for new resources
      const newOrders = this.fractionalIndexingService.generateKeysBetween(
        prevResource?.order || null,
        nextResource?.order || null,
        sortedPins.length,
      );

      const createdResources: ResourceDto[] = [];

      for (let i = 0; i < sortedPins.length; i++) {
        const pin = sortedPins[i];
        const isSharedPin = !!pin.pinMeta?.sharedPinId;

        const newResource = manager.create(ResourceEntity, {
          collectionId: resource.collectionId,
          order: newOrders[i],
        });
        const savedResource = await manager.save(newResource);

        // Update pin to reference new resource
        pin.resourceId = savedResource.id;
        pin.resource = savedResource;
        (pin as any).order = null; // Single-pin resources don't need pin order
        await manager.save(pin);

        const basePinDto = this.mapPinToDto(pin);
        const enrichedPin = await this.enrichPinWithSharedData(basePinDto);

        createdResources.push({
          id: savedResource.id,
          order: savedResource.order,
          type: isSharedPin ? 'shared-pin' : 'pin',
          pins: {
            data: [enrichedPin],
            pagination: {
              currentPage: 1,
              totalItems: 1,
              itemsPerPage: DEFAULT_ITEMS_LIMIT,
            },
          },
        });
      }

      await manager.remove(resource);

      return createdResources;
    });
  }

  private async enrichPinWithSharedData(
    pin: PinDto,
    checkNested: boolean = true,
  ): Promise<PinDto> {
    const isSharedPin = pin.meta?.sharedPinId;

    if (isSharedPin) {
      const ownVariantsCount = pin.variants.data.length;

      if (ownVariantsCount < DEFAULT_ITEMS_LIMIT) {
        const remainingToFetch = DEFAULT_ITEMS_LIMIT - ownVariantsCount;
        const sharedVariantsResult = await this.pinsService.findVariants(
          pin.meta!.sharedPinId!,
          { page: 1, limit: remainingToFetch },
        );

        return {
          ...pin,
          fromShared: {
            variants: {
              data: sharedVariantsResult.variants,
              pagination: sharedVariantsResult.pagination,
            },
          },
        };
      }
    }
    return pin;
  }

  private async enrichResourceWithSharedPins(
    resource: any, // ResourceDto or structure resembling it
    pins: PinDto[],
  ): Promise<{ pins: PinDto[]; fromShared?: any }> {
    // Enrich existing pins (e.g. if they are shared pins themselves)
    const enrichedPins = await Promise.all(
      pins.map((pin) => this.enrichPinWithSharedData(pin, true)),
    );

    const isSharedGroup = resource.meta?.sharedResourceId;
    let fromSharedResourceData: any = undefined;

    if (isSharedGroup) {
      const ownPinsCount = enrichedPins.length;

      if (ownPinsCount < DEFAULT_ITEMS_LIMIT) {
        const remainingToFetch = DEFAULT_ITEMS_LIMIT - ownPinsCount;
        const sharedPinsResult = await this.pinsService.findPins(
          resource.meta.sharedResourceId,
          { page: 1, limit: remainingToFetch },
        );

        // For pins coming from the shared group, we also need to check if THEY are shared pins (nested)
        // and enrich them if they are.
        const sharedPinsWithVariantFromShared = await Promise.all(
          sharedPinsResult.pins.map(async (sharedPin) => {
            return this.enrichPinWithSharedData(sharedPin, true);
          }),
        );

        fromSharedResourceData = {
          pins: {
            data: sharedPinsWithVariantFromShared,
            pagination: sharedPinsResult.pagination,
          },
        };
      }
    }

    return {
      pins: enrichedPins,
      fromShared: fromSharedResourceData,
    };
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

  private mapPinToDto(
    pin: PinEntity,
    options?: {
      totalVariants?: number;
      fromShared?: {
        variants: {
          data: { id: string; order: string; config: any }[];
          pagination: {
            currentPage: number;
            totalItems: number;
            itemsPerPage: number;
          };
        };
      };
    },
  ) {
    const variantsToReturn = pin.variants
      .slice(0, DEFAULT_ITEMS_LIMIT)
      .map((variant) => ({
        id: variant.id,
        order: variant.order,
        config: variant.config,
      }));

    const totalVariants = options?.totalVariants ?? pin.variants.length;

    return {
      id: pin.id,
      order: pin.order,
      meta: pin.pinMeta
        ? {
            sharedPinId: pin.pinMeta.sharedPinId,
            firstPinId: pin.pinMeta.firstPinId,
            inheritedVariantsTotal: pin.pinMeta.inheritedVariantsTotal,
            history: pin.pinMeta.history,
          }
        : undefined,
      variants: {
        data: variantsToReturn,
        pagination: {
          currentPage: 1,
          totalItems: totalVariants,
          itemsPerPage: DEFAULT_ITEMS_LIMIT,
        },
      },
      ...(options?.fromShared ? { fromShared: options.fromShared } : {}),
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

  private defineResourceType(
    resourceMeta: any | undefined,
    pins: any[],
  ): 'pin' | 'shared-pin' | 'pin-group' | 'shared-pin-group' {
    if (resourceMeta) {
      return resourceMeta.sharedResourceId ? 'shared-pin-group' : 'pin-group';
    }

    const firstPin = pins[0];
    if (firstPin?.meta?.sharedPinId) {
      return 'shared-pin';
    }

    return 'pin';
  }
}
