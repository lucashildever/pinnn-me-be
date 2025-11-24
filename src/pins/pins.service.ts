import {
  Logger,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { VariantEntity } from './entities/variant.entity';
import { PinEntity } from './entities/pin.entity';

import { PaginatedPinsResponseDto } from './dto/pagination/paginated-pins-response.dto';
import { PaginationQueryDto } from './dto/pagination/pagination-query.dto';
import { CreateVariantDto } from './dto/variant/create-variant.dto';
import { CreatePinDto } from './dto/create-pin.dto';
import { UpdatePinDto } from './dto/update-pin.dto';
import { ReorderDto } from './dto/reorder.dto';
import { VariantDto } from './dto/variant/variant.dto';
import { PinDto } from './dto/pin.dto';

import { FractionalIndexingService } from 'src/common/services/fractional-indexing.service';
import { IntegrationsService } from 'src/integrations/integrations.service';
import { CacheService } from 'src/cache/cache.service';
import { EmbedConfigDto } from './dto/variant/embed-config.dto';

@Injectable()
export class PinsService {
  private readonly logger = new Logger(PinsService.name);

  constructor(
    @InjectRepository(PinEntity)
    private readonly pinsRepository: Repository<PinEntity>,
    @InjectRepository(CollectionEntity)
    private readonly collectionsRepository: Repository<CollectionEntity>,
    @InjectRepository(VariantEntity)
    private readonly variantsRepository: Repository<VariantEntity>,

    private readonly fractionalIndexingService: FractionalIndexingService,
    private readonly integrationsService: IntegrationsService,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) { }

  private readonly CACHE_TTL = 300;
  private readonly PINS_CACHE_KEY = (
    collectionId: string,
    page: number,
    limit: number,
  ) => `pins:collection:${collectionId}:page:${page}:limit:${limit}`;

  private readonly PINS_CACHE_PATTERN = (collectionId: string) =>
    `pins:collection:${collectionId}:*`;

  private async invalidateCollectionPinsCache(
    collectionId: string,
  ): Promise<void> {
    const cachePattern = this.PINS_CACHE_PATTERN(collectionId);
    await this.cacheService.del(cachePattern);
  }

  async create(
    collectionId: string,
    createPinDto: CreatePinDto,
  ): Promise<PinDto> {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .where('collection.id = :collectionId', { collectionId })
        .andWhere('collection.status = :status', { status: 'active' })
        .getCount();

      if (!collection) {
        throw new NotFoundException(
          `Collection with id ${collectionId} not found or inactive`,
        );
      }

      const maxOrderResult = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .select('MAX(pin.order)', 'maxOrder')
        .where('pin.collectionId = :collectionId', { collectionId })
        .andWhere('pin.status = :status', { status: 'active' })
        .getRawOne();

      const nextOrder = this.fractionalIndexingService.generateKeyBetween(
        maxOrderResult?.maxOrder || null,
        null,
      );

      if (createPinDto.variants && createPinDto.variants.length > 0) {
        this.validateVariantsOrdering(createPinDto.variants);
      }

      const pin = manager.create(PinEntity, {
        collectionId: collectionId,
        order: nextOrder,
      });

      const savedPin = await manager.save(pin);

      const enrichedVariants = await this.enrichVariantsWithIntegrationData(
        createPinDto.variants || [],
      );

      const variantEntities: VariantEntity[] = [];

      for (const variantDto of enrichedVariants) {
        const variantEntity = manager.create(VariantEntity, {
          pinId: savedPin.id,
          order: variantDto.order,
          config: variantDto.config,
        });

        const savedVariant = await manager.save(variantEntity);
        variantEntities.push(savedVariant);
      }

      await this.invalidateCollectionPinsCache(collectionId);

      const response: PinDto = {
        id: savedPin.id,
        order: savedPin.order,
        variants: variantEntities.map((variant) => ({
          id: variant.id,
          order: variant.order,
          config: variant.config,
        })),
      };

      return response;
    });
  }

  private async enrichVariantsWithIntegrationData(
    variants: CreateVariantDto[],
  ): Promise<CreateVariantDto[]> {
    if (!variants || variants.length === 0) {
      return [];
    }

    const enrichedVariants = await Promise.all(
      variants.map(async (variant) => {
        if (variant.config.type !== 'integration') {
          return variant;
        }

        if (!variant.config.embedConfig) {
          this.logger.warn('Integration variant missing embedConfig');
          return variant;
        }

        const { platform, url } = variant.config.embedConfig;

        try {
          this.logger.debug(
            `Fetching integration data for platform: ${platform}, URL: ${url}`,
          );

          const integrationData =
            await this.integrationsService.fetchIntegration(platform, url);

          this.logger.debug(
            `Successfully fetched integration data for ${platform}`,
          );

          return {
            ...variant,
            config: {
              ...variant.config,
              embedConfig: {
                platform,
                url,
                html: integrationData.html,
                title: integrationData.title,
                thumbnail: integrationData.thumbnailUrl,
                fetchStatus: 'success' as const,
              },
            },
          };
        } catch (error) {
          this.logger.warn(
            `Failed to fetch integration for ${platform}: ${error.message}`,
          );

          return {
            ...variant,
            config: {
              ...variant.config,
              embedConfig: {
                platform,
                url,
                integrationHtml: null,
                integrationTitle: null,
                integrationThumbnail: null,
                fetchStatus: 'failed' as const,
                fetchError: error.message,
              },
            },
          };
        }
      }),
    );

    return enrichedVariants;
  }

  private validateVariantsOrdering(variants: CreateVariantDto[]): void {
    const orders = variants.map((variant) => variant.order);

    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      throw new BadRequestException('Duplicate variant orders are not allowed');
    }

    const sortedOrders = [...orders].sort();
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== sortedOrders[i]) {
        throw new BadRequestException(
          'Variants must be provided in sequential order',
        );
      }
    }
  }

  async softDelete(pinId: string): Promise<{ message: string }> {
    return await this.dataSource.transaction(async (manager) => {
      const pinToDelete = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .where('pin.id = :pinId', { pinId })
        .andWhere('pin.status = :status', { status: 'active' })
        .select(['pin.id', 'pin.collectionId'])
        .getOne();

      if (!pinToDelete) {
        throw new NotFoundException(`Pin with ID ${pinId} not found`);
      }

      await manager.update(
        PinEntity,
        { id: pinToDelete.id },
        { status: 'deleted' },
      );

      await this.invalidateCollectionPinsCache(pinToDelete.collectionId);

      return { message: `Pin with ID ${pinId} successfully deleted` };
    });
  }

  async createVariant(
    pinId: string,
    createVariantDto: CreateVariantDto,
  ): Promise<VariantDto> {
    return await this.dataSource.transaction(async (manager) => {
      const pin = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .select(['pin.id', 'pin.collectionId'])
        .where('pin.id = :pinId', { pinId: pinId })
        .andWhere('pin.status = :status', { status: 'active' })
        .getOne();

      if (!pin) {
        throw new NotFoundException(
          `Pin with id ${pinId} not found or inactive`,
        );
      }

      const variant = manager.create(VariantEntity, {
        pinId: pinId,
        order: createVariantDto.order,
        config: createVariantDto.config,
      });

      const savedVariant = await manager.save(variant);

      await this.invalidateCollectionPinsCache(pin.collectionId);

      const response: VariantDto = {
        id: savedVariant.id,
        order: savedVariant.order,
        config: savedVariant.config,
      };

      return response;
    });
  }

  async update(pinId: string, updatePinDto: UpdatePinDto): Promise<PinDto> {
    return await this.dataSource.transaction(async (manager) => {
      const pinToUpdate = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .leftJoinAndSelect('pin.variants', 'variants')
        .where('pin.id = :pinId', { pinId })
        .andWhere('pin.status = :status', { status: 'active' })
        .getOne();

      if (!pinToUpdate) {
        throw new NotFoundException(`Pin with ID ${pinId} not found`);
      }

      let pinUpdated = false;

      if (updatePinDto.variants && updatePinDto.variants.length > 0) {
        for (const variantUpdate of updatePinDto.variants) {
          const variantToUpdate = pinToUpdate.variants.find(
            (variant) => variant.id === variantUpdate.id,
          );

          if (!variantToUpdate) {
            throw new NotFoundException(
              `Variant with ID ${variantUpdate.id} not found in pin ${pinId}`,
            );
          }

          let variantUpdated = false;

          if (variantUpdate.config !== undefined) {
            variantToUpdate.config = variantUpdate.config;
            variantUpdated = true;
          }

          if (variantUpdated) {
            await manager.save(variantToUpdate);
          }
        }
      }

      await this.invalidateCollectionPinsCache(pinToUpdate.collectionId);

      const updatedPin = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .leftJoinAndSelect('pin.variants', 'variants')
        .where('pin.id = :pinId', { pinId })
        .orderBy('variants.order', 'ASC')
        .getOne();

      if (!updatedPin) {
        throw new NotFoundException(`Updated pin with ID ${pinId} not found`);
      }

      return {
        id: updatedPin.id,
        order: updatedPin.order,
        variants: updatedPin.variants.map((variant) => ({
          id: variant.id,
          order: variant.order,
          config: variant.config,
        })),
      };
    });
  }

  async reorder(
    id: string,
    reorderDto: ReorderDto,
  ): Promise<{ message: string }> {
    return await this.dataSource.transaction(async (manager) => {
      if (reorderDto.type === 'pin') {
        return await this.reorderPin(manager, id, reorderDto.newOrder);
      } else {
        return await this.reorderVariant(manager, id, reorderDto.newOrder);
      }
    });
  }

  private async reorderPin(
    manager: EntityManager,
    pinId: string,
    newOrder: string,
  ): Promise<{ message: string }> {
    const pinToReorder = await manager
      .createQueryBuilder(PinEntity, 'pin')
      .where('pin.id = :pinId', { pinId })
      .andWhere('pin.status = :status', { status: 'active' })
      .getOne();

    if (!pinToReorder) {
      throw new NotFoundException(`Pin with ID ${pinId} not found`);
    }

    const predecessor = await manager
      .createQueryBuilder(PinEntity, 'pin')
      .where('pin.collectionId = :collectionId', {
        collectionId: pinToReorder.collectionId,
      })
      .andWhere('pin.status = :status', { status: 'active' })
      .andWhere('pin.id != :pinId', { pinId })
      .andWhere('pin.order < :newOrder', { newOrder })
      .orderBy('pin.order', 'DESC')
      .limit(1)
      .getOne();

    const successor = await manager
      .createQueryBuilder(PinEntity, 'pin')
      .where('pin.collectionId = :collectionId', {
        collectionId: pinToReorder.collectionId,
      })
      .andWhere('pin.status = :status', { status: 'active' })
      .andWhere('pin.id != :pinId', { pinId })
      .andWhere('pin.order > :newOrder', { newOrder })
      .orderBy('pin.order', 'ASC')
      .limit(1)
      .getOne();

    const existingWithSameOrder = await manager
      .createQueryBuilder(PinEntity, 'pin')
      .where('pin.collectionId = :collectionId', {
        collectionId: pinToReorder.collectionId,
      })
      .andWhere('pin.status = :status', { status: 'active' })
      .andWhere('pin.id != :pinId', { pinId })
      .andWhere('pin.order = :newOrder', { newOrder })
      .getOne();

    if (existingWithSameOrder) {
      throw new BadRequestException('Order position already exists');
    }

    if (predecessor && newOrder <= predecessor.order) {
      throw new BadRequestException(
        'New order must be greater than predecessor',
      );
    }

    if (successor && newOrder >= successor.order) {
      throw new BadRequestException('New order must be less than successor');
    }

    await manager.update(PinEntity, { id: pinId }, { order: newOrder });

    await this.invalidateCollectionPinsCache(pinToReorder.collectionId);

    return { message: `Pin ${pinId} successfully reordered` };
  }

  private async reorderVariant(
    manager: EntityManager,
    variantId: string,
    newOrder: string,
  ): Promise<{ message: string }> {
    const variantToUpdate = await manager
      .createQueryBuilder(VariantEntity, 'variant')
      .where('variant.id = :variantId', { variantId })
      .getOne();

    if (!variantToUpdate) {
      throw new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    // Busca o pin para invalidar cache da coleção
    const pin = await manager
      .createQueryBuilder(PinEntity, 'pin')
      .where('pin.id = :pinId', { pinId: variantToUpdate.pinId })
      .andWhere('pin.status = :status', { status: 'active' })
      .getOne();

    if (!pin) {
      throw new NotFoundException(
        `Pin with ID ${variantToUpdate.pinId} not found`,
      );
    }

    const predecessor = await manager
      .createQueryBuilder(VariantEntity, 'variant')
      .where('variant.pinId = :pinId', { pinId: variantToUpdate.pinId })
      .andWhere('variant.id != :variantId', { variantId })
      .andWhere('variant.order < :newOrder', { newOrder })
      .orderBy('variant.order', 'DESC')
      .limit(1)
      .getOne();

    const successor = await manager
      .createQueryBuilder(VariantEntity, 'variant')
      .where('variant.pinId = :pinId', { pinId: variantToUpdate.pinId })
      .andWhere('variant.id != :variantId', { variantId })
      .andWhere('variant.order > :newOrder', { newOrder })
      .orderBy('variant.order', 'ASC')
      .limit(1)
      .getOne();

    const existingWithSameOrder = await manager
      .createQueryBuilder(VariantEntity, 'variant')
      .where('variant.pinId = :pinId', { pinId: variantToUpdate.pinId })
      .andWhere('variant.id != :variantId', { variantId })
      .andWhere('variant.order = :newOrder', { newOrder })
      .getOne();

    if (existingWithSameOrder) {
      throw new BadRequestException('Order position already exists');
    }

    if (predecessor && newOrder <= predecessor.order) {
      throw new BadRequestException(
        'New order must be greater than predecessor',
      );
    }

    if (successor && newOrder >= successor.order) {
      throw new BadRequestException('New order must be less than successor');
    }

    await manager.update(VariantEntity, { id: variantId }, { order: newOrder });

    await this.invalidateCollectionPinsCache(pin.collectionId);

    return { message: `Variant ${variantId} successfully reordered` };
  }
}
