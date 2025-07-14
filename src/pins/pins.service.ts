import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { CardEntity } from './entities/card.entity';
import { PinEntity } from './entities/pin.entity';

import { PaginatedPinsResponseDto } from './dto/paginated/paginated-pins-response.dto';
import { PaginationQueryDto } from './dto/paginated/pagination-query.dto';
import { CreateCardDto } from './dto/card/create-card.dto';
import { CreatePinDto } from './dto/create-pin.dto';
import { UpdatePinDto } from './dto/update-pin.dto';
import { ReorderDto } from './dto/reorder.dto';
import { CardDto } from './dto/card/card.dto';
import { PinDto } from './dto/pin.dto';

import { FractionalIndexingService } from 'src/common/services/fractional-indexing.service';
import { CacheService } from 'src/cache/cache.service';

import { Status } from 'src/common/enums/status.enum';

@Injectable()
export class PinsService {
  constructor(
    @InjectRepository(PinEntity)
    private readonly pinRepository: Repository<PinEntity>,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
    private readonly fractionalIndexingService: FractionalIndexingService,
  ) {}

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

  async findPaginated(
    collectionId: string,
    paginationQueryDto: PaginationQueryDto,
  ): Promise<PaginatedPinsResponseDto> {
    const { page = 1, limit = 5 } = paginationQueryDto;

    const cacheKey = this.PINS_CACHE_KEY(collectionId, page, limit);

    const cachedPins =
      await this.cacheService.get<PaginatedPinsResponseDto>(cacheKey);

    if (cachedPins) {
      return cachedPins;
    }

    const skip = (page - 1) * limit;

    const [pins, total] = await this.pinRepository.findAndCount({
      where: {
        collectionId: collectionId,
        status: Status.Active,
      },
      relations: ['cards'],
      order: {
        order: 'ASC',
        cards: {
          order: 'ASC',
        },
      },
      skip,
      take: limit,
    });

    const response: PaginatedPinsResponseDto = {
      data: pins.map((pin) => ({
        id: pin.id,
        description: pin.description,
        collection_id: pin.collectionId,
        order: pin.order,
        cards: pin.cards.map((card) => {
          const { pinId, ...cardWithoutPinId } = card;
          return cardWithoutPinId;
        }),
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };

    await this.cacheService.set(cacheKey, response, this.CACHE_TTL);
    return response;
  }

  async findOne(pinId: string): Promise<PinDto> {
    const pin = await this.pinRepository.findOne({
      where: {
        id: pinId,
        status: Status.Active,
      },
      relations: ['cards'],
      order: {
        cards: {
          order: 'ASC',
        },
      },
    });

    if (!pin) {
      throw new NotFoundException(`Pin with ID ${pinId} not found`);
    }

    const response: PinDto = {
      id: pin.id,
      description: pin.description,
      order: pin.order,
      cards: pin.cards.map((card) => {
        const { pinId, ...cardWithoutPinId } = card;
        return cardWithoutPinId;
      }),
    };

    return response;
  }

  async create(
    collectionId: string,
    createPinDto: CreatePinDto,
  ): Promise<PinDto> {
    return await this.dataSource.transaction(async (manager) => {
      const collection = await manager
        .createQueryBuilder(CollectionEntity, 'collection')
        .where('collection.id = :collectionId', {
          collectionId: collectionId,
        })
        .andWhere('collection.status = :status', { status: Status.Active })
        .getCount();

      if (!collection) {
        throw new NotFoundException(
          `Collection with id ${collectionId} not found or inactive`,
        );
      }

      const maxOrderResult = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .select('MAX(pin.order)', 'maxOrder')
        .where('pin.collectionId = :collectionId', {
          collectionId: collectionId,
        })
        .andWhere('pin.status = :status', { status: Status.Active })
        .getRawOne();

      const nextOrder = this.fractionalIndexingService.generateKeyBetween(
        maxOrderResult?.maxOrder || null,
        null,
      );

      if (createPinDto.cards && createPinDto.cards.length > 0) {
        this.validateCardsOrdering(createPinDto.cards);
      }

      const pin = manager.create(PinEntity, {
        description: createPinDto.description,
        collectionId: collectionId,
        order: nextOrder,
        status: Status.Active,
      });

      const savedPin = await manager.save(pin);

      const cardEntities: CardEntity[] = [];

      if (createPinDto.cards && createPinDto.cards.length > 0) {
        for (const cardDto of createPinDto.cards) {
          const cardEntity = manager.create(CardEntity, {
            pinId: savedPin.id,
            order: cardDto.order,
            caption: cardDto.caption,
            cardConfig: cardDto.cardConfig,
          });

          const savedCard = await manager.save(cardEntity);
          cardEntities.push(savedCard);
        }
      }

      await this.invalidateCollectionPinsCache(collectionId);

      const response: PinDto = {
        id: savedPin.id,
        description: savedPin.description,
        order: savedPin.order,
        cards: cardEntities.map((card) => ({
          id: card.id,
          order: card.order,
          caption: card.caption,
          cardConfig: card.cardConfig,
        })),
      };

      return response;
    });
  }

  private validateCardsOrdering(cards: CreateCardDto[]): void {
    const orders = cards.map((card) => card.order);

    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      throw new BadRequestException('Duplicate card orders are not allowed');
    }

    const sortedOrders = [...orders].sort();
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== sortedOrders[i]) {
        throw new BadRequestException(
          'Cards must be provided in sequential order',
        );
      }
    }
  }

  async softDelete(pinId: string): Promise<{ message: string }> {
    return await this.dataSource.transaction(async (manager) => {
      const pinToDelete = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .where('pin.id = :pinId', { pinId })
        .andWhere('pin.status = :status', { status: Status.Active })
        .select(['pin.id', 'pin.collectionId'])
        .getOne();

      if (!pinToDelete) {
        throw new NotFoundException(`Pin with ID ${pinId} not found`);
      }

      await manager.update(
        PinEntity,
        { id: pinToDelete.id },
        { status: Status.Deleted },
      );

      await this.invalidateCollectionPinsCache(pinToDelete.collectionId);

      return { message: `Pin with ID ${pinId} successfully deleted` };
    });
  }

  async createCard(
    pinId: string,
    createCardDto: CreateCardDto,
  ): Promise<CardDto> {
    return await this.dataSource.transaction(async (manager) => {
      const pin = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .select(['pin.id', 'pin.collectionId'])
        .where('pin.id = :pinId', { pinId: pinId })
        .andWhere('pin.status = :status', { status: Status.Active })
        .getOne();

      if (!pin) {
        throw new NotFoundException(
          `Pin with id ${pinId} not found or inactive`,
        );
      }

      const maxOrderResult = await manager
        .createQueryBuilder(CardEntity, 'card')
        .select('MAX(card.order)', 'maxOrder')
        .where('card.pinId = :pinId', { pinId: pinId })
        .getRawOne();

      const nextOrder = this.fractionalIndexingService.generateKeyBetween(
        maxOrderResult?.maxOrder || null,
        null,
      );

      const card = manager.create(CardEntity, {
        pinId: pinId,
        order: nextOrder,
        caption: createCardDto.caption,
        cardConfig: createCardDto.cardConfig,
      });

      const savedCard = await manager.save(card);

      await this.invalidateCollectionPinsCache(pin.collectionId);

      const response: CardDto = {
        id: savedCard.id,
        order: savedCard.order,
        caption: savedCard.caption,
        cardConfig: savedCard.cardConfig,
      };

      return response;
    });
  }

  async update(pinId: string, updatePinDto: UpdatePinDto): Promise<PinDto> {
    return await this.dataSource.transaction(async (manager) => {
      const pinToUpdate = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .leftJoinAndSelect('pin.cards', 'cards')
        .where('pin.id = :pinId', { pinId })
        .andWhere('pin.status = :status', { status: Status.Active })
        .getOne();

      if (!pinToUpdate) {
        throw new NotFoundException(`Pin with ID ${pinId} not found`);
      }

      let pinUpdated = false;

      if (updatePinDto.description !== undefined) {
        pinToUpdate.description = updatePinDto.description;
        pinUpdated = true;
      }

      if (pinUpdated) {
        await manager.save(pinToUpdate);
      }

      if (updatePinDto.cards && updatePinDto.cards.length > 0) {
        for (const cardUpdate of updatePinDto.cards) {
          const cardToUpdate = pinToUpdate.cards.find(
            (card) => card.id === cardUpdate.id,
          );

          if (!cardToUpdate) {
            throw new NotFoundException(
              `Card with ID ${cardUpdate.id} not found in pin ${pinId}`,
            );
          }

          let cardUpdated = false;

          if (cardUpdate.caption !== undefined) {
            cardToUpdate.caption = cardUpdate.caption;
            cardUpdated = true;
          }

          if (cardUpdate.cardConfig !== undefined) {
            cardToUpdate.cardConfig = cardUpdate.cardConfig;
            cardUpdated = true;
          }

          if (cardUpdated) {
            await manager.save(cardToUpdate);
          }
        }
      }

      await this.invalidateCollectionPinsCache(pinToUpdate.collectionId);

      const updatedPin = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .leftJoinAndSelect('pin.cards', 'cards')
        .where('pin.id = :pinId', { pinId })
        .orderBy('cards.order', 'ASC')
        .getOne();

      if (!updatedPin) {
        throw new NotFoundException(`Updated pin with ID ${pinId} not found`);
      }

      return {
        id: updatedPin.id,
        description: updatedPin.description,
        order: updatedPin.order,
        cards: updatedPin.cards.map((card) => ({
          id: card.id,
          order: card.order,
          caption: card.caption,
          cardConfig: card.cardConfig,
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
        return await this.reorderCard(manager, id, reorderDto.newOrder);
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
      .andWhere('pin.status = :status', { status: Status.Active })
      .getOne();

    if (!pinToReorder) {
      throw new NotFoundException(`Pin with ID ${pinId} not found`);
    }

    const predecessor = await manager
      .createQueryBuilder(PinEntity, 'pin')
      .where('pin.collectionId = :collectionId', {
        collectionId: pinToReorder.collectionId,
      })
      .andWhere('pin.status = :status', { status: Status.Active })
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
      .andWhere('pin.status = :status', { status: Status.Active })
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
      .andWhere('pin.status = :status', { status: Status.Active })
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

  private async reorderCard(
    manager: EntityManager,
    cardId: string,
    newOrder: string,
  ): Promise<{ message: string }> {
    const cardToUpdate = await manager
      .createQueryBuilder(CardEntity, 'card')
      .where('card.id = :cardId', { cardId })
      .getOne();

    if (!cardToUpdate) {
      throw new NotFoundException(`Card with ID ${cardId} not found`);
    }

    // Busca o pin para invalidar cache da coleção
    const pin = await manager
      .createQueryBuilder(PinEntity, 'pin')
      .where('pin.id = :pinId', { pinId: cardToUpdate.pinId })
      .andWhere('pin.status = :status', { status: Status.Active })
      .getOne();

    if (!pin) {
      throw new NotFoundException(
        `Pin with ID ${cardToUpdate.pinId} not found`,
      );
    }

    const predecessor = await manager
      .createQueryBuilder(CardEntity, 'card')
      .where('card.pinId = :pinId', { pinId: cardToUpdate.pinId })
      .andWhere('card.id != :cardId', { cardId })
      .andWhere('card.order < :newOrder', { newOrder })
      .orderBy('card.order', 'DESC')
      .limit(1)
      .getOne();

    const successor = await manager
      .createQueryBuilder(CardEntity, 'card')
      .where('card.pinId = :pinId', { pinId: cardToUpdate.pinId })
      .andWhere('card.id != :cardId', { cardId })
      .andWhere('card.order > :newOrder', { newOrder })
      .orderBy('card.order', 'ASC')
      .limit(1)
      .getOne();

    const existingWithSameOrder = await manager
      .createQueryBuilder(CardEntity, 'card')
      .where('card.pinId = :pinId', { pinId: cardToUpdate.pinId })
      .andWhere('card.id != :cardId', { cardId })
      .andWhere('card.order = :newOrder', { newOrder })
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

    await manager.update(CardEntity, { id: cardId }, { order: newOrder });

    await this.invalidateCollectionPinsCache(pin.collectionId);

    return { message: `Card ${cardId} successfully reordered` };
  }
}
