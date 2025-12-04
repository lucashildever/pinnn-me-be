import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesService } from './resources.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResourceEntity } from './entities/resource.entity';
import { PinsService } from '../pins/pins.service';
import { FractionalIndexingService } from '../common/services/fractional-indexing.service';
import { DataSource, Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination/pagination-query.dto';
import { NotFoundException } from '@nestjs/common';
import { PinDto } from '../pins/dto/pin.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlansService } from '../plans/plans.service';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let resourcesRepository: Repository<ResourceEntity>;
  let pinsService: PinsService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  };

  const mockResourcesRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockPinsService = {
    findBatchPreviews: jest.fn(),
  };

  const mockSubscriptionsService = {
    validateSubscriptionLimits: jest.fn(),
  };

  const mockPlansService = {};

  const mockFractionalIndexingService = {
    validateOrderSequence: jest.fn(),
    generateKeyBetween: jest.fn(),
    validateOrder: jest.fn(),
  };
  const mockDataSource = {
    transaction: jest.fn((cb) => cb({} as any)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        {
          provide: getRepositoryToken(ResourceEntity),
          useValue: mockResourcesRepository,
        },
        {
          provide: PinsService,
          useValue: mockPinsService,
        },
        {
          provide: FractionalIndexingService,
          useValue: mockFractionalIndexingService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
        {
          provide: PlansService,
          useValue: mockPlansService,
        },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
    resourcesRepository = module.get<Repository<ResourceEntity>>(
      getRepositoryToken(ResourceEntity),
    );
    pinsService = module.get<PinsService>(PinsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findResources', () => {
    it('should return paginated resources successfully', async () => {
      const collectionId = 'collection-1';
      const paginationQuery: PaginationQueryDto = { page: 1, limit: 10 };
      const mockResources = [
        { id: 'res-1', order: 'a', resourceMeta: { groupName: 'Group 1' } },
        { id: 'res-2', order: 'b', resourceMeta: null },
      ] as unknown as ResourceEntity[];
      const total = 2;
      const mockPinsMap = new Map<string, PinDto[]>([
        ['res-1', [{ id: 'pin-1' } as PinDto]],
        ['res-2', []],
      ]);

      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        mockResources,
        total,
      ]);
      mockPinsService.findBatchPreviews.mockResolvedValue(mockPinsMap);

      const result = await service.findResources(collectionId, paginationQuery);

      expect(mockResourcesRepository.createQueryBuilder).toHaveBeenCalledWith(
        'resource',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'resource.collectionId = :collectionId',
        { collectionId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'resource.status = :status',
        { status: 'active' },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(pinsService.findBatchPreviews).toHaveBeenCalledWith([
        'res-1',
        'res-2',
      ]);

      expect(result.resources).toHaveLength(2);
      expect(result.resources[0].id).toBe('res-1');
      expect(result.resources[0].meta).toBeDefined();
      expect(result.resources[0].meta!.groupName).toBe('Group 1');
      expect(result.resources[0].pins).toHaveLength(1);
      expect(result.resources[1].id).toBe('res-2');
      expect(result.resources[1].meta).toBeUndefined();
      expect(result.resources[1].pins).toHaveLength(0);
      expect(result.pagination).toEqual({
        currentPage: 1,
        totalItems: 2,
        itemsPerPage: 10,
      });
    });

    it('should return empty list if no resources found', async () => {
      const collectionId = 'collection-1';
      const paginationQuery: PaginationQueryDto = { page: 1, limit: 10 };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockPinsService.findBatchPreviews.mockResolvedValue(new Map());

      const result = await service.findResources(collectionId, paginationQuery);

      expect(result.resources).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const collectionId = 'collection-1';
      const paginationQuery: PaginationQueryDto = { page: 2, limit: 5 };
      const mockResources = [] as ResourceEntity[];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockResources, 0]);
      mockPinsService.findBatchPreviews.mockResolvedValue(new Map());

      await service.findResources(collectionId, paginationQuery);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });
  });

  describe('findResource', () => {
    it('should return a resource successfully', async () => {
      const resourceId = 'res-1';
      const mockResource = {
        id: resourceId,
        order: 'a',
        resourceMeta: { groupName: 'Group 1' },
      } as unknown as ResourceEntity;
      const mockPinsMap = new Map<string, PinDto[]>([
        [resourceId, [{ id: 'pin-1' } as PinDto]],
      ]);

      mockQueryBuilder.getOne.mockResolvedValue(mockResource);
      mockPinsService.findBatchPreviews.mockResolvedValue(mockPinsMap);

      const result = await service.findResource(resourceId);

      expect(mockResourcesRepository.createQueryBuilder).toHaveBeenCalledWith(
        'resource',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'resource.id = :resourceId',
        { resourceId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'resource.status = :status',
        { status: 'active' },
      );
      expect(pinsService.findBatchPreviews).toHaveBeenCalledWith([resourceId]);

      expect(result.id).toBe(resourceId);
      expect(result.meta).toBeDefined();
      expect(result.meta!.groupName).toBe('Group 1');
      expect(result.pins).toHaveLength(1);
    });

    it('should throw NotFoundException if resource not found', async () => {
      const resourceId = 'invalid-id';

      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findResource(resourceId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should populate resource metadata correctly', async () => {
      const resourceId = 'res-1';
      const mockResource = {
        id: resourceId,
        order: 'a',
        resourceMeta: {
          sharedResourceId: 'shared-1',
          firstResourceId: 'first-1',
          groupName: 'Group 1',
          history: [],
        },
      } as unknown as ResourceEntity;

      mockQueryBuilder.getOne.mockResolvedValue(mockResource);
      mockPinsService.findBatchPreviews.mockResolvedValue(new Map());

      const result = await service.findResource(resourceId);

      expect(result.meta).toEqual({
        sharedResourceId: 'shared-1',
        firstResourceId: 'first-1',
        groupName: 'Group 1',
        history: [],
      });
    });
  });

  describe('createPinResource', () => {
    const collectionId = 'collection-1';
    const createPinResourceDto = {
      variants: [{ order: 'a0' }],
    } as any;

    const mockCollection = {
      id: collectionId,
      mural: { userId: 'user-1' },
    };

    const mockManager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      })),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockDataSource.transaction.mockImplementation((cb) => cb(mockManager));
      mockManager.findOne.mockResolvedValue(mockCollection);
      mockFractionalIndexingService['validateOrderSequence'] = jest
        .fn()
        .mockReturnValue(true);
      mockFractionalIndexingService['generateKeyBetween'] = jest
        .fn()
        .mockReturnValue('a1');
      mockSubscriptionsService.validateSubscriptionLimits.mockResolvedValue(
        undefined,
      );
      mockManager.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'saved-id' }),
      );
      mockManager.create.mockImplementation((entity, dto) => dto || entity);
    });

    it('should create a resource with a single pin successfully (Happy Path)', async () => {
      const savedResource = { id: 'res-1', order: 'a1' };
      const savedPin = {
        id: 'pin-1',
        pinMeta: { firstPinId: null },
        variants: [{ id: 'v-1', order: 'a0', config: {} }],
      };

      mockManager.save
        .mockResolvedValueOnce(savedResource)
        .mockResolvedValueOnce(savedPin)
        .mockResolvedValueOnce({ ...savedPin.pinMeta, firstPinId: 'pin-1' });

      const result = await service.createPinResource(
        collectionId,
        createPinResourceDto,
      );

      expect(
        mockSubscriptionsService.validateSubscriptionLimits,
      ).toHaveBeenCalledWith('user-1', 'variants_per_pin', 1);

      expect(
        mockFractionalIndexingService['validateOrderSequence'],
      ).toHaveBeenCalledWith(['a0']);
      expect(mockManager.create).toHaveBeenCalledWith(
        ResourceEntity,
        expect.objectContaining({
          collectionId,
          order: 'a1',
        }),
      );
      expect(mockManager.create).not.toHaveBeenCalledWith(
        ResourceEntity,
        expect.objectContaining({
          resourceMeta: expect.anything(),
        }),
      );

      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(), // PinMetaEntity class (hard to check exact class ref in mock)
        // PinMeta is created without args first
      );
      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(), // PinEntity class
        expect.objectContaining({
          resource: savedResource,
          pinMeta: expect.anything(),
        }),
      );

      expect(savedPin.pinMeta.firstPinId).toBe('pin-1');

      expect(result).toEqual({
        id: savedResource.id,
        order: savedResource.order,
        pins: expect.any(Array),
      });
    });

    it('should throw NotFoundException if collection not found', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.createPinResource(collectionId, createPinResourceDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if variant order is invalid', async () => {
      mockFractionalIndexingService['validateOrderSequence'].mockReturnValue(
        false,
      );

      await expect(
        service.createPinResource(collectionId, createPinResourceDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate exception if subscription limit exceeded', async () => {
      mockSubscriptionsService.validateSubscriptionLimits.mockRejectedValue(
        new Error('Limit exceeded'),
      );

      await expect(
        service.createPinResource(collectionId, createPinResourceDto),
      ).rejects.toThrow('Limit exceeded');
    });
  });
});
