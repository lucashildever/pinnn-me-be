import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CollectionResponseDto } from './dto/collection-response.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

import { DisplayElementEntity } from 'src/common/entities/display-element.entity';
import { CollectionEntity } from './entities/collection.entity';
import { MuralEntity } from 'src/murals/entities/mural.entity';

import { FractionalIndexingService } from 'src/common/services/fractional-indexing.service';
import { CacheService } from 'src/cache/cache.service';

import { Status } from 'src/common/enums/status.enum';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(CollectionEntity)
    private readonly collectionsRepository: Repository<CollectionEntity>,

    private readonly fractionalIndexingService: FractionalIndexingService,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly COLLECTION_LIST_CACHE_KEY = (muralId: string) =>
    `collections:mural:${muralId}`;
  private readonly COLLECTION_MAIN_CACHE_KEY = (muralId: string) =>
    `collections:mural:${muralId}:main`;
  private readonly CACHE_TTL = 300;

  async findAll(
    muralId: string,
    includeInactives: boolean = false,
  ): Promise<CollectionResponseDto[]> {
    const cacheKey = this.COLLECTION_LIST_CACHE_KEY(muralId);
    const cachedCollections =
      await this.cacheService.get<CollectionResponseDto[]>(cacheKey);

    if (cachedCollections) {
      return cachedCollections;
    }

    const queryBuilder = this.collectionsRepository
      .createQueryBuilder('collection')
      .innerJoin('collection.mural', 'mural')
      .innerJoinAndSelect('collection.displayElement', 'displayElement')
      .where('mural.id = :muralId', { muralId });

    if (!includeInactives) {
      queryBuilder.andWhere('collection.status = :status', {
        status: Status.Active,
      });
    }

    const collections = await queryBuilder
      .select([
        'collection.id',
        'collection.order',
        'collection.isMain',
        'displayElement.content',
        'displayElement.iconConfig',
      ])
      .orderBy('collection.isMain', 'DESC')
      .addOrderBy('collection.order', 'ASC')
      .getMany();

    const collectionsResponse = collections.map((collection) => ({
      id: collection.id,
      order: collection.order,
      isMain: collection.isMain,
      displayElement: {
        content: collection.displayElement.content,
        iconConfig: collection.displayElement.iconConfig,
      },
    }));

    await this.cacheService.set(cacheKey, collectionsResponse, this.CACHE_TTL);

    return collectionsResponse;
  }

  async create(
    muralId: string,
    createCollectionDto: CreateCollectionDto,
  ): Promise<CollectionResponseDto> {
    return await this.dataSource.transaction(async (manager) => {
      const mural = await manager
        .createQueryBuilder(MuralEntity, 'mural')
        .select(['mural.id', 'mural.name'])
        .where('mural.id = :id', { id: muralId })
        .andWhere('mural.status = :status', { status: Status.Active })
        .getOne();

      if (!mural) {
        throw new NotFoundException(`Mural not found`);
      }

      if (createCollectionDto.isMain === true) {
        // If the collection is Main, set all the others as false
        await manager.update(
          CollectionEntity,
          {
            muralId: mural.id,
            status: Status.Active,
          },
          { isMain: false },
        );
      }

      const maxOrderResult = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .select('collection.order', 'order')
        .where('collection.muralId = :muralId', { muralId: mural.id })
        .andWhere('collection.status = :status', { status: Status.Active })
        .orderBy('collection.order', 'DESC')
        .limit(1)
        .getRawOne<{ order: string }>();

      const highestKey = maxOrderResult?.order ?? null;
      const nextOrderKey = this.fractionalIndexingService.generateKeyBetween(
        highestKey,
        null,
      );

      const displayElement = manager.create(DisplayElementEntity, {
        content: createCollectionDto.displayElement.content,
        iconConfig: createCollectionDto.displayElement.iconConfig,
      });

      const savedDisplayElement = await manager.save(displayElement);

      const collection = manager.create(CollectionEntity, {
        muralId: muralId,
        isMain: createCollectionDto.isMain ?? false,
        order: nextOrderKey,
        displayElement: savedDisplayElement,
      });
      const savedCollection = await manager.save(collection);

      const fullCollection = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .innerJoin('collection.displayElement', 'displayElement')
        .where('collection.id = :id', { id: savedCollection.id })
        .select([
          'collection.id',
          'collection.isMain',
          'collection.order',
          'displayElement.content',
          'displayElement.iconConfig',
        ])
        .getOne();

      if (!fullCollection) {
        throw new NotFoundException(
          'Internal error: Collection not found after creation',
        );
      }

      const responseDto: CollectionResponseDto = {
        id: fullCollection.id,
        isMain: fullCollection.isMain,
        order: fullCollection.order,
        displayElement: {
          content: fullCollection.displayElement.content,
          iconConfig: fullCollection.displayElement.iconConfig,
        },
      };

      await this.cacheService.del(this.COLLECTION_LIST_CACHE_KEY(mural.name));
      await this.cacheService.del(this.COLLECTION_MAIN_CACHE_KEY(mural.name));

      return responseDto;
    });
  }

  async update(
    collectionId: string,
    updateCollectionDto: UpdateCollectionDto,
  ): Promise<CollectionResponseDto> {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .innerJoin('collection.mural', 'mural')
        .innerJoin('collection.displayElement', 'displayElement')
        .where('collection.id = :collectionId', {
          collectionId: collectionId,
        })
        .andWhere('collection.status = :status', { status: Status.Active })
        .select([
          'collection.id',
          'collection.muralId',
          'collection.isMain',
          'collection.order',
          'collection.status',
          'mural.name',
          'displayElement.id',
          'displayElement.content',
          'displayElement.iconConfig',
        ])
        .getOne();

      if (!collection) {
        throw new NotFoundException(
          `Collection with id ${collectionId} not found`,
        );
      }

      if (updateCollectionDto.isMain === true) {
        await manager.update(
          CollectionEntity,
          {
            muralId: collection.muralId,
            status: Status.Active,
          },
          { isMain: false },
        );
      }

      // Atualizar DisplayElement se fornecido
      if (updateCollectionDto.displayElement) {
        await manager.update(
          DisplayElementEntity,
          { id: collection.displayElement.id },
          {
            content: updateCollectionDto.displayElement.content,
            iconConfig: updateCollectionDto.displayElement.iconConfig,
          },
        );
      }

      // Atualizar Collection (apenas campos da própria collection)
      const { displayElement, ...collectionUpdateData } = updateCollectionDto;
      if (Object.keys(collectionUpdateData).length > 0) {
        await manager.update(
          CollectionEntity,
          { id: collection.id },
          collectionUpdateData,
        );
      }

      const updatedCollection = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .innerJoin('collection.displayElement', 'displayElement')
        .where('collection.id = :id', { id: collection.id })
        .select([
          'collection.id',
          'collection.isMain',
          'collection.order',
          'collection.status',
          'displayElement.content',
          'displayElement.iconConfig',
        ])
        .getOne();

      if (!updatedCollection) {
        throw new NotFoundException(
          'Internal error: Collection not found after update',
        );
      }

      const response: CollectionResponseDto = {
        id: updatedCollection.id,
        isMain: updatedCollection.isMain,
        order: updatedCollection.order,
        displayElement: {
          content: updatedCollection.displayElement.content,
          iconConfig: updatedCollection.displayElement.iconConfig,
        },
      };

      await this.cacheService.del(
        this.COLLECTION_LIST_CACHE_KEY(collection.mural.name),
      );
      await this.cacheService.del(
        this.COLLECTION_MAIN_CACHE_KEY(collection.mural.name),
      );

      return response;
    });
  }

  async findMain(muralId: string): Promise<CollectionResponseDto> {
    const cacheKey = this.COLLECTION_MAIN_CACHE_KEY(muralId);
    const cachedCollection =
      await this.cacheService.get<CollectionResponseDto>(cacheKey);

    if (cachedCollection) {
      return cachedCollection;
    }

    const mainCollection = await this.collectionsRepository
      .createQueryBuilder('collection')
      .innerJoin('collection.displayElement', 'displayElement')
      .where('collection.muralId = :muralId', { muralId })
      .andWhere('collection.isMain = :isMain', { isMain: true })
      .andWhere('collection.status = :status', { status: Status.Active })
      .select([
        'collection.id',
        'collection.isMain',
        'collection.order',
        'displayElement.content',
        'displayElement.iconConfig',
      ])
      .getOne();

    if (!mainCollection) {
      throw new NotFoundException(
        `Main collection not found for mural ID ${muralId}.`,
      );
    }

    const responseDto: CollectionResponseDto = {
      id: mainCollection.id,
      isMain: mainCollection.isMain,
      order: mainCollection.order,
      displayElement: {
        content: mainCollection.displayElement.content,
        iconConfig: mainCollection.displayElement.iconConfig,
      },
    };

    await this.cacheService.set(cacheKey, responseDto, this.CACHE_TTL);

    return responseDto;
  }

  async softDelete(collectionId: string): Promise<{ message: string }> {
    return await this.dataSource.transaction(async (manager) => {
      const collectionToDelete = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .innerJoin('collection.mural', 'mural')
        .where('collection.id = :collectionId', { collectionId })
        .andWhere('collection.status = :status', { status: Status.Active })
        .select([
          'collection.id',
          'collection.isMain',
          'collection.content',
          'collection.muralId',
          'collection.order',
          'collection.status',
        ])
        .getOne();

      if (!collectionToDelete) {
        throw new NotFoundException(
          `Collection with ID ${collectionId} not found`,
        );
      }

      await manager.update(
        CollectionEntity,
        { id: collectionToDelete.id },
        { status: Status.Deleted }, // Mark as deleted
      );

      const wasMain = collectionToDelete.isMain;
      const collectionContent = collectionToDelete.displayElement.content;
      const muralId = collectionToDelete.muralId;

      if (wasMain) {
        // If the deleted collection was main, set the first active as main
        const firstCollection = await manager
          .createQueryBuilder(CollectionEntity, 'collection')
          .where('collection.muralId = :muralId', {
            muralId: collectionToDelete.muralId,
          })
          .andWhere('collection.status = :status', { status: Status.Active })
          .orderBy('collection.order', 'ASC')
          .getOne();

        if (firstCollection) {
          await manager.update(
            CollectionEntity,
            { id: firstCollection.id },
            { isMain: true },
          );
        }
      }

      await this.invalidateCache(muralId);

      return {
        message: `Collection "${collectionContent}" was successfully deleted`,
      };
    });
  }

  async reorder(
    collectionId: string,
    newOrder: string,
  ): Promise<{ message: string }> {
    return await this.dataSource.transaction(async (manager) => {
      const collectionToReorder = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .where('collection.id = :collectionId', { collectionId })
        .andWhere('collection.status = :status', { status: Status.Active })
        .getOne();

      if (!collectionToReorder) {
        throw new NotFoundException(
          `Collection with ID ${collectionId} not found`,
        );
      }

      const predecessor = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .where('collection.muralId = :muralId', {
          muralId: collectionToReorder.muralId,
        })
        .andWhere('collection.status = :status', { status: Status.Active })
        .andWhere('collection.id != :id', { id: collectionId })
        .andWhere('collection.order < :newOrder', { newOrder: newOrder })
        .orderBy('collection.order', 'DESC')
        .limit(1)
        .getOne();

      const successor = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .where('collection.muralId = :muralId', {
          muralId: collectionToReorder.muralId,
        })
        .andWhere('collection.status = :status', { status: Status.Active })
        .andWhere('collection.id != :collectionId', { collectionId })
        .andWhere('collection.order > :newOrder', { newOrder })
        .orderBy('collection.order', 'ASC')
        .limit(1)
        .getOne();

      const existingWithSameOrder = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .where('collection.muralId = :muralId', {
          muralId: collectionToReorder.muralId,
        })
        .andWhere('collection.status = :status', { status: Status.Active })
        .andWhere('collection.id != :collectionId', { collectionId })
        .andWhere('collection.order = :newOrder', { newOrder })
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

      await manager.update(
        CollectionEntity,
        { id: collectionId },
        { order: newOrder },
      );

      this.invalidateCache(collectionToReorder.muralId);

      return { message: `Collection ${collectionId} successfully reordered` };
    });
  }

  async invalidateCache(muralId: string): Promise<void> {
    await this.cacheService.del(this.COLLECTION_LIST_CACHE_KEY(muralId));
    await this.cacheService.del(this.COLLECTION_MAIN_CACHE_KEY(muralId));
  }
}
