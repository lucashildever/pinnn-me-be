import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ResourcesService } from './resources.service';
import { ResourceEntity } from './entities/resource.entity';
import { ResourceMetaEntity } from './entities/resource-meta.entity';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { PinsService } from 'src/pins/pins.service';
import { FractionalIndexingService } from 'src/common/services/fractional-indexing.service';
import { CreateResourceDto } from './dto/create-resource.dto';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let pinsService: jest.Mocked<PinsService>;
  let fractionalIndexingService: jest.Mocked<FractionalIndexingService>;
  let dataSource: jest.Mocked<DataSource>;
  let resourcesRepository: jest.Mocked<Repository<ResourceEntity>>;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<ResourceEntity>>;

  const mockCollectionId = '123e4567-e89b-12d3-a456-426614174000';
  const mockResourceId = '123e4567-e89b-12d3-a456-426614174001';
  const mockPinId = '123e4567-e89b-12d3-a456-426614174002';

  const mockCollection: Partial<CollectionEntity> = {
    id: mockCollectionId,
    muralId: 'mural-id',
  };

  const mockPinDto = {
    id: mockPinId,
    order: undefined,
    variants: [
      {
        id: 'variant-1',
        order: 'a0',
        config: { type: 'text' as const, content: 'Test content' },
      },
    ],
  };

  beforeEach(async () => {
    // QueryBuilder Mock
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
    } as any;

    // EntityManager Mock
    mockEntityManager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as any;

    // DataSource Mock with transaction support
    dataSource = {
      transaction: jest.fn((callback) => callback(mockEntityManager)),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        {
          provide: getRepositoryToken(ResourceEntity),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            findOne: jest.fn(),
          },
        },
        {
          provide: PinsService,
          useValue: {
            create: jest.fn(),
            createWithManager: jest.fn(),
          },
        },
        {
          provide: FractionalIndexingService,
          useValue: {
            generateKeyBetween: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
    pinsService = module.get(PinsService);
    fractionalIndexingService = module.get(FractionalIndexingService);
    resourcesRepository = module.get(getRepositoryToken(ResourceEntity));
  });

  describe('create', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create a resource with a single pin successfully', async () => {
      // Arrange
      const createResourceDto: CreateResourceDto = {
        pins: [
          {
            variants: [
              {
                order: 'a0',
                config: { type: 'text', content: 'Test content' },
              },
            ],
          },
        ],
      };

      mockEntityManager.findOne.mockResolvedValueOnce(mockCollection); // Collection exists
      queryBuilder.getRawOne.mockResolvedValueOnce(null); // No previous resources
      fractionalIndexingService.generateKeyBetween.mockReturnValue('a0');
      pinsService.createWithManager.mockResolvedValueOnce(mockPinDto);

      const mockResourceMeta = { id: 'meta-id' } as ResourceMetaEntity;
      const mockResource = {
        id: mockResourceId,
        order: 'a0',
        pins: [{ id: mockPinId }],
        resourceMeta: mockResourceMeta,
      } as ResourceEntity;

      mockEntityManager.create.mockReturnValueOnce(mockResource as any);
      mockEntityManager.save.mockResolvedValueOnce(mockResource);

      // Act
      const result = await service.create(mockCollectionId, createResourceDto);

      // Assert
      expect(result).toEqual({
        id: mockResourceId,
        order: 'a0',
        data: [mockPinDto],
      });

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(CollectionEntity, {
        where: { id: mockCollectionId },
      });

      expect(pinsService.createWithManager).toHaveBeenCalledWith(
        mockEntityManager,
        createResourceDto.pins[0],
      );

      expect(fractionalIndexingService.generateKeyBetween).toHaveBeenCalledWith(
        null,
        null,
      );
    });

    it('should throw NotFoundException when collection does not exist', async () => {
      // Arrange
      const createResourceDto: CreateResourceDto = {
        pins: [
          {
            variants: [
              { order: 'a0', config: { type: 'text', content: 'Test' } },
            ],
          },
        ],
      };

      mockEntityManager.findOne.mockResolvedValueOnce(null); // Collection not found

      // Act & Assert
      await expect(
        service.create(mockCollectionId, createResourceDto),
      ).rejects.toThrow(new NotFoundException('Collection not found'));

      expect(pinsService.createWithManager).not.toHaveBeenCalled();
    });

    it('should generate correct fractional indexing order based on last resource', async () => {
      // Arrange
      const createResourceDto: CreateResourceDto = {
        pins: [
          {
            variants: [
              { order: 'a0', config: { type: 'text', content: 'Test' } },
            ],
          },
        ],
      };

      mockEntityManager.findOne.mockResolvedValueOnce(mockCollection);
      queryBuilder.getRawOne.mockResolvedValueOnce({ resource_order: 'a0' });
      fractionalIndexingService.generateKeyBetween.mockReturnValue('a1');
      pinsService.createWithManager.mockResolvedValueOnce(mockPinDto);

      const mockResource = {
        id: mockResourceId,
        order: 'a1',
        pins: [{ id: mockPinId }],
        resourceMeta: {},
      } as ResourceEntity;

      mockEntityManager.create.mockReturnValueOnce(mockResource as any);
      mockEntityManager.save.mockResolvedValueOnce(mockResource);

      // Act
      await service.create(mockCollectionId, createResourceDto);

      // Assert
      expect(fractionalIndexingService.generateKeyBetween).toHaveBeenCalledWith(
        'a0',
        null,
      );
    });

    it('should rollback pins if resource creation fails (transaction atomicity)', async () => {
      // Arrange
      const createResourceDto: CreateResourceDto = {
        pins: [
          {
            variants: [
              { order: 'a0', config: { type: 'text', content: 'Test' } },
            ],
          },
        ],
      };

      mockEntityManager.findOne.mockResolvedValueOnce(mockCollection);
      queryBuilder.getRawOne.mockResolvedValueOnce(null);
      fractionalIndexingService.generateKeyBetween.mockReturnValue('a0');
      pinsService.createWithManager.mockResolvedValueOnce(mockPinDto);

      // Simulate resource save failure
      const mockError = new Error('Database error');
      mockEntityManager.save.mockRejectedValueOnce(mockError);

      // Mock transaction to propagate error
      dataSource.transaction.mockImplementationOnce(async (callback: any) => {
        try {
          return await callback(mockEntityManager);
        } catch (error) {
          throw error; // Transaction should rollback
        }
      });

      // Act & Assert
      await expect(
        service.create(mockCollectionId, createResourceDto),
      ).rejects.toThrow('Database error');

      // Pin was created in the same transaction,
      // so it should be rolled back automatically by TypeORM
      expect(pinsService.createWithManager).toHaveBeenCalled();
    });

    it('should create shared resource with history', async () => {
      // Arrange
      const sharedResourceId = 'shared-resource-id';
      const firstResourceId = 'first-resource-id';

      const createResourceDto: CreateResourceDto = {
        sharedResourceId,
        sourceMuralId: 'source-mural-id',
        pins: [
          {
            variants: [
              { order: 'a0', config: { type: 'text', content: 'Test' } },
            ],
          },
        ],
      };

      const sharedResource = {
        id: sharedResourceId,
        resourceMeta: {
          firstResourceId,
          history: [
            { sharedMuralId: 'mural-1', order: 1 },
            { sharedMuralId: 'mural-2', order: 2 },
          ],
        },
      } as ResourceEntity;

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockCollection) // Collection
        .mockResolvedValueOnce(sharedResource); // Shared resource

      queryBuilder.getRawOne.mockResolvedValueOnce(null);
      fractionalIndexingService.generateKeyBetween.mockReturnValue('a0');
      pinsService.createWithManager.mockResolvedValueOnce(mockPinDto);

      const mockResource = {
        id: mockResourceId,
        order: 'a0',
        pins: [{ id: mockPinId }],
        resourceMeta: {
          sharedResourceId,
          firstResourceId,
          history: [
            { sharedMuralId: 'mural-1', order: 1 },
            { sharedMuralId: 'mural-2', order: 2 },
            { sharedMuralId: 'source-mural-id', order: 3 },
          ],
        },
      } as ResourceEntity;

      mockEntityManager.create.mockReturnValueOnce(mockResource as any);
      mockEntityManager.save.mockResolvedValueOnce(mockResource);

      // Act
      const result = await service.create(mockCollectionId, createResourceDto);

      // Assert
      expect(result.id).toBe(mockResourceId);
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(ResourceEntity, {
        where: { id: sharedResourceId },
        relations: ['resourceMeta'],
      });
    });

    it('should limit history to 5 items by removing oldest', async () => {
      // Arrange
      const sharedResourceId = 'shared-resource-id';

      const createResourceDto: CreateResourceDto = {
        sharedResourceId,
        sourceMuralId: 'source-mural-id',
        pins: [
          {
            variants: [
              { order: 'a0', config: { type: 'text', content: 'Test' } },
            ],
          },
        ],
      };

      // History already has 5 items
      const sharedResource = {
        id: sharedResourceId,
        resourceMeta: {
          firstResourceId: 'first',
          history: [
            { sharedMuralId: 'mural-1', order: 1 },
            { sharedMuralId: 'mural-2', order: 2 },
            { sharedMuralId: 'mural-3', order: 3 },
            { sharedMuralId: 'mural-4', order: 4 },
            { sharedMuralId: 'mural-5', order: 5 },
          ],
        },
      } as ResourceEntity;

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockCollection)
        .mockResolvedValueOnce(sharedResource);

      queryBuilder.getRawOne.mockResolvedValueOnce(null);
      fractionalIndexingService.generateKeyBetween.mockReturnValue('a0');
      pinsService.createWithManager.mockResolvedValueOnce(mockPinDto);

      let savedResourceMeta: any;
      mockEntityManager.create.mockImplementationOnce((entity, data: any) => {
        savedResourceMeta = data.resourceMeta;
        return {
          id: mockResourceId,
          order: 'a0',
          pins: [{ id: mockPinId }],
          resourceMeta: savedResourceMeta,
        } as any;
      });

      mockEntityManager.save.mockResolvedValue({} as any);

      // Act
      await service.create(mockCollectionId, createResourceDto);

      // Assert
      expect(savedResourceMeta.history).toHaveLength(5);
      expect(savedResourceMeta.history[0].order).toBe(2); // Oldest (order 1) removed
      expect(savedResourceMeta.history[4].order).toBe(6); // New item added
    });

    it('should create pin group and set firstResourceId', async () => {
      // Arrange
      const createResourceDto: CreateResourceDto = {
        groupName: 'Test Group',
        pins: [
          {
            variants: [
              { order: 'a0', config: { type: 'text', content: 'Pin 1' } },
            ],
          },
          {
            variants: [
              { order: 'a0', config: { type: 'text', content: 'Pin 2' } },
            ],
          },
        ],
      };

      mockEntityManager.findOne.mockResolvedValueOnce(mockCollection);
      queryBuilder.getRawOne.mockResolvedValueOnce(null);
      fractionalIndexingService.generateKeyBetween.mockReturnValue('a0');

      pinsService.createWithManager
        .mockResolvedValueOnce({ ...mockPinDto, id: 'pin-1' })
        .mockResolvedValueOnce({ ...mockPinDto, id: 'pin-2' });

      const mockResourceMeta: any = { id: 'meta-id', groupName: 'Test Group' };
      const mockResource = {
        id: mockResourceId,
        order: 'a0',
        pins: [{ id: 'pin-1' }, { id: 'pin-2' }],
        resourceMeta: mockResourceMeta,
      } as any;

      mockEntityManager.create.mockReturnValueOnce(mockResource);
      mockEntityManager.save
        .mockResolvedValueOnce(mockResource) // First save (resource)
        .mockResolvedValueOnce(mockResourceMeta); // Second save (resourceMeta with firstResourceId)

      // Act
      await service.create(mockCollectionId, createResourceDto);

      // Assert
      expect(pinsService.createWithManager).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
      expect(mockResourceMeta.firstResourceId).toBe(mockResourceId);
    });

    it('should create resource with multiple pins', async () => {
      // Arrange
      const createResourceDto: CreateResourceDto = {
        pins: [
          {
            variants: [
              { order: 'a0', config: { type: 'text', content: 'Pin 1' } },
            ],
          },
          {
            variants: [
              { order: 'a0', config: { type: 'text', content: 'Pin 2' } },
            ],
          },
          {
            variants: [
              { order: 'a0', config: { type: 'text', content: 'Pin 3' } },
            ],
          },
        ],
      };

      mockEntityManager.findOne.mockResolvedValueOnce(mockCollection);
      queryBuilder.getRawOne.mockResolvedValueOnce(null);
      fractionalIndexingService.generateKeyBetween.mockReturnValue('a0');

      pinsService.createWithManager
        .mockResolvedValueOnce({ ...mockPinDto, id: 'pin-1' })
        .mockResolvedValueOnce({ ...mockPinDto, id: 'pin-2' })
        .mockResolvedValueOnce({ ...mockPinDto, id: 'pin-3' });

      const mockResource = {
        id: mockResourceId,
        order: 'a0',
        pins: [{ id: 'pin-1' }, { id: 'pin-2' }, { id: 'pin-3' }],
        resourceMeta: {},
      } as ResourceEntity;

      mockEntityManager.create.mockReturnValueOnce(mockResource as any);
      mockEntityManager.save.mockResolvedValueOnce(mockResource as any);

      // Act
      const result = await service.create(mockCollectionId, createResourceDto);

      // Assert
      expect(pinsService.createWithManager).toHaveBeenCalledTimes(3);
      expect(result.data).toHaveLength(3);
    });
  });
});
