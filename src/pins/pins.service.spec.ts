import { Repository, SelectQueryBuilder } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { CollectionEntity } from '../collections/entities/collection.entity';
import { PinEntity } from './entities/pin.entity';

import { CacheService } from 'src/cache/cache.service';
import { PinsService } from './pins.service';

import { PaginationQueryDto } from './dto/pagination/pagination-query.dto';

import { Status } from '../common/enums/status.enum';

describe('PinsService', () => {
  let service: PinsService;
  let pinsRepository: jest.Mocked<Repository<PinEntity>>;
  let collectionsRepository: jest.Mocked<Repository<CollectionEntity>>;
  let cacheService: jest.Mocked<CacheService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<PinEntity>>;

  const mockCollectionId = '123e4567-e89b-12d3-a456-426614174000';
  const mockPinId = '123e4567-e89b-12d3-a456-426614174001';
  const mockCardId = '123e4567-e89b-12d3-a456-426614174002';

  const mockPin: Partial<PinEntity> = {
    id: mockPinId,
    collectionId: mockCollectionId,
    description: 'Test pin description',
    order: '1',
    status: Status.Active,
    cards: [
      {
        id: mockCardId,
        pinId: mockPinId,
        caption: 'Test card caption',
        order: '1',
        cardConfig: { type: 'text', content: 'test' },
      } as any,
    ],
  };

  const mockPaginatedResponse = {
    data: [
      {
        id: mockPinId,
        description: 'Test pin description',
        collection_id: mockCollectionId,
        order: '1',
        cards: [
          {
            id: mockCardId,
            caption: 'Test card caption',
            order: '1',
            cardConfig: { type: 'text', content: 'test' },
          },
        ],
      },
    ],
    pagination: {
      currentPage: 1,
      totalItems: 1,
      itemsPerPage: 5,
    },
  };

  beforeEach(async () => {
    // QueryBuilder Mock
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinsService,
        {
          provide: getRepositoryToken(PinEntity),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CollectionEntity),
          useValue: {
            exists: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PinsService>(PinsService);
    pinsRepository = module.get(getRepositoryToken(PinEntity));
    collectionsRepository = module.get(getRepositoryToken(CollectionEntity));
    cacheService = module.get(CacheService);
  });

  describe('findPaginated', () => {
    const paginationQuery: PaginationQueryDto = { page: 1, limit: 5 };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw NotFoundException when collection does not exist', async () => {
      // Arrange
      collectionsRepository.exists.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.findPaginated(mockCollectionId, paginationQuery),
      ).rejects.toThrow(
        new NotFoundException(
          `Collection with ID ${mockCollectionId} not found`,
        ),
      );

      expect(collectionsRepository.exists).toHaveBeenCalledWith({
        where: { id: mockCollectionId },
      });
    });

    it('should return cached data when available', async () => {
      // Arrange
      collectionsRepository.exists.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await service.findPaginated(
        mockCollectionId,
        paginationQuery,
      );

      // Assert
      expect(result).toEqual(mockPaginatedResponse);
      expect(cacheService.get).toHaveBeenCalled();
      expect(pinsRepository.count).not.toHaveBeenCalled();
    });

    it('should return paginated pins when collection exists and no cache', async () => {
      // Arrange
      collectionsRepository.exists.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(null);
      pinsRepository.count.mockResolvedValue(1);
      queryBuilder.getMany.mockResolvedValue([mockPin as PinEntity]);

      // Act
      const result = await service.findPaginated(
        mockCollectionId,
        paginationQuery,
      );

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(mockPinId);
      expect(result.data[0].cards[0]).not.toHaveProperty('pinId');
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalItems).toBe(1);
      expect(result.pagination.itemsPerPage).toBe(5);
    });

    it('should use default pagination values when not provided', async () => {
      // Arrange
      const emptyPaginationQuery = {};
      collectionsRepository.exists.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(null);
      pinsRepository.count.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.findPaginated(
        mockCollectionId,
        emptyPaginationQuery,
      );

      // Assert
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.itemsPerPage).toBe(5);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should calculate skip correctly for different pages', async () => {
      // Arrange
      const page2Query = { page: 2, limit: 10 };
      collectionsRepository.exists.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(null);
      pinsRepository.count.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.findPaginated(mockCollectionId, page2Query);

      // Assert
      expect(queryBuilder.skip).toHaveBeenCalledWith(10); // (2-1) * 10
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should return empty data when collection exists but has no active pins', async () => {
      // Arrange
      collectionsRepository.exists.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(null);
      pinsRepository.count.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.findPaginated(
        mockCollectionId,
        paginationQuery,
      );

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.pagination.totalItems).toBe(0);
    });

    it('should apply correct filters and ordering in query', async () => {
      // Arrange
      collectionsRepository.exists.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(null);
      pinsRepository.count.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.findPaginated(mockCollectionId, paginationQuery);

      // Assert
      expect(pinsRepository.createQueryBuilder).toHaveBeenCalledWith('pin');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'pin.cards',
        'card',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'pin.collectionId = :collectionId',
        { collectionId: mockCollectionId },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'pin.status = :status',
        { status: Status.Active },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('pin.order', 'ASC');
    });

    it('should sort cards by order within each pin', async () => {
      // Arrange
      const pinWithUnsortedCards: Partial<PinEntity> = {
        ...mockPin,
        cards: [
          { ...mockPin.cards![0], order: '2' } as any,
          { ...mockPin.cards![0], id: 'card2', order: '1' } as any,
        ],
      };

      collectionsRepository.exists.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(null);
      pinsRepository.count.mockResolvedValue(1);
      queryBuilder.getMany.mockResolvedValue([
        pinWithUnsortedCards as PinEntity,
      ]);

      // Act
      const result = await service.findPaginated(
        mockCollectionId,
        paginationQuery,
      );

      // Assert
      expect(result.data[0].cards[0].order).toBe('1');
      expect(result.data[0].cards[1].order).toBe('2');
    });

    it('should cache the response after fetching from database', async () => {
      // Arrange
      collectionsRepository.exists.mockResolvedValue(true);
      cacheService.get.mockResolvedValue(null);
      pinsRepository.count.mockResolvedValue(1);
      queryBuilder.getMany.mockResolvedValue([mockPin as PinEntity]);

      // Act
      await service.findPaginated(mockCollectionId, paginationQuery);

      // Assert
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String), // cacheKey
        expect.objectContaining({
          data: expect.any(Array),
          pagination: expect.any(Object),
        }),
        expect.any(Number), // CACHE_TTL
      );
    });
  });
});
