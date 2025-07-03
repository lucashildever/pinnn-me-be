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

import { MuralEntity } from 'src/mural/entities/mural.entity';
import { CollectionEntity } from './entities/collection.entity';

import { FractionalIndexingService } from 'src/common/services/fractional-indexing.service';
import { CacheService } from 'src/cache/cache.service';

import { Status } from 'src/common/enums/status.enum';

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(CollectionEntity)
    private readonly collectionRepository: Repository<CollectionEntity>,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
    private readonly fractionalIndexingService: FractionalIndexingService,
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

    const queryBuilder = this.collectionRepository
      .createQueryBuilder('collection')
      .innerJoin('collection.mural', 'mural')
      .where('mural.id = :muralId', { muralId });

    if (!includeInactives) {
      queryBuilder.andWhere('collection.status = :status', {
        status: Status.ACTIVE,
      });
    }

    const collections = await queryBuilder
      .select([
        'collection.id',
        'collection.type',
        'collection.isMain',
        'collection.icon',
        'collection.content',
        'collection.order',
      ])
      .orderBy('collection.isMain', 'DESC')
      .addOrderBy('collection.order', 'ASC')
      .getMany();

    const collectionsResponse = collections.map((collection) => ({
      id: collection.id,
      type: collection.type,
      isMain: collection.isMain,
      icon: collection.icon,
      content: collection.content,
      order: collection.order,
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
        .andWhere('mural.status = :status', { status: Status.ACTIVE })
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
            status: Status.ACTIVE,
          },
          { isMain: false },
        );
      }

      const maxOrderResult = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .select('collection.order', 'order')
        .where('collection.muralId = :muralId', { muralId: mural.id })
        .andWhere('collection.status = :status', { status: Status.ACTIVE })
        .orderBy('collection.order', 'DESC')
        .limit(1)
        .getRawOne<{ order: string }>();

      const highestKey = maxOrderResult?.order ?? null;
      const nextOrderKey = this.fractionalIndexingService.generateKeyBetween(
        highestKey,
        null,
      );

      const collection = manager.create(CollectionEntity, {
        muralId: muralId,
        type: createCollectionDto.type,
        icon: createCollectionDto.icon,
        content: createCollectionDto.content,
        isMain: createCollectionDto.isMain ?? false,
        order: nextOrderKey,
      });

      const savedCollection = await manager.save(collection);

      const fullCollection = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .where('collection.id = :id', { id: savedCollection.id })
        .select([
          'collection.id',
          'collection.type',
          'collection.isMain',
          'collection.icon',
          'collection.content',
          'collection.order',
        ])
        .getOne();

      if (!fullCollection) {
        throw new NotFoundException(
          'Internal error: Collection not found after creation',
        );
      }

      const responseDto: CollectionResponseDto = {
        id: fullCollection.id,
        type: fullCollection.type,
        isMain: fullCollection.isMain,
        icon: fullCollection.icon,
        content: fullCollection.content,
        order: fullCollection.order,
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
        .where('collection.id = :collectionId', {
          collectionId: collectionId,
        })
        .andWhere('collection.status = :status', { status: Status.ACTIVE })
        .select([
          'collection.id',
          'collection.muralId',
          'collection.type',
          'collection.isMain',
          'collection.icon',
          'collection.content',
          'collection.order',
          'collection.status',
          'mural.name',
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
            status: Status.ACTIVE,
          },
          { isMain: false },
        );
      }

      await manager.update(
        CollectionEntity,
        { id: collection.id },
        updateCollectionDto,
      );

      const updatedCollection = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .where('collection.id = :id', { id: collection.id })
        .select([
          'collection.id',
          'collection.type',
          'collection.isMain',
          'collection.icon',
          'collection.content',
          'collection.order',
          'collection.status',
        ])
        .getOne();

      if (!updatedCollection) {
        throw new NotFoundException(
          'Internal error: Collection not found after update',
        );
      }

      const response: CollectionResponseDto = {
        id: updatedCollection.id,
        type: updatedCollection.type,
        isMain: updatedCollection.isMain,
        icon: updatedCollection.icon,
        content: updatedCollection.content,
        order: updatedCollection.order,
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

    const mainCollection = await this.collectionRepository
      .createQueryBuilder('collection')
      .where('collection.muralId = :muralId', { muralId })
      .andWhere('collection.isMain = :isMain', { isMain: true })
      .andWhere('collection.status = :status', { status: Status.ACTIVE })
      .select([
        'collection.id',
        'collection.type',
        'collection.isMain',
        'collection.icon',
        'collection.content',
        'collection.order',
      ])
      .getOne();

    if (!mainCollection) {
      throw new NotFoundException(
        `Main collection not found for mural ID ${muralId}.`,
      );
    }

    const responseDto: CollectionResponseDto = {
      id: mainCollection.id,
      type: mainCollection.type,
      isMain: mainCollection.isMain,
      icon: mainCollection.icon,
      content: mainCollection.content,
      order: mainCollection.order,
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
        .andWhere('collection.status = :status', { status: Status.ACTIVE })
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
        { status: Status.DELETED }, // Mark as deleted
      );

      const wasMain = collectionToDelete.isMain;
      const collectionContent = collectionToDelete.content;
      const muralId = collectionToDelete.muralId;

      if (wasMain) {
        // If the deleted collection was main, set the first active as main
        const firstCollection = await manager
          .createQueryBuilder(CollectionEntity, 'collection')
          .where('collection.muralId = :muralId', {
            muralId: collectionToDelete.muralId,
          })
          .andWhere('collection.status = :status', { status: Status.ACTIVE })
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
        .andWhere('collection.status = :status', { status: Status.ACTIVE })
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
        .andWhere('collection.status = :status', { status: Status.ACTIVE })
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
        .andWhere('collection.status = :status', { status: Status.ACTIVE })
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
        .andWhere('collection.status = :status', { status: Status.ACTIVE })
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
