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
    findVariants: jest.fn(),
    getPinCountsByResourceIds: jest.fn(),
    getPinCountByResourceId: jest.fn(),
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
      const mockPinCounts = new Map<string, number>([
        ['res-1', 5],
        ['res-2', 0],
      ]);

      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        mockResources,
        total,
      ]);
      mockPinsService.findBatchPreviews.mockResolvedValue(mockPinsMap);
      mockPinsService.getPinCountsByResourceIds.mockResolvedValue(
        mockPinCounts,
      );

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
      expect(pinsService.getPinCountsByResourceIds).toHaveBeenCalledWith([
        'res-1',
        'res-2',
      ]);

      expect(result.resources).toHaveLength(2);
      expect(result.resources[0].id).toBe('res-1');
      expect(result.resources[0].meta).toBeDefined();
      expect(result.resources[0].meta!.groupName).toBe('Group 1');
      expect(result.resources[0].pins.data).toHaveLength(1);
      expect(result.resources[0].pins.pagination.totalItems).toBe(5);
      expect(result.resources[1].id).toBe('res-2');
      expect(result.resources[1].meta).toBeUndefined();
      expect(result.resources[1].pins.data).toHaveLength(0);
      expect(result.resources[1].pins.pagination.totalItems).toBe(0);
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
      mockPinsService.getPinCountsByResourceIds.mockResolvedValue(new Map());

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
      mockPinsService.getPinCountsByResourceIds.mockResolvedValue(new Map());

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
      mockPinsService.getPinCountByResourceId.mockResolvedValue(5);

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
      expect(pinsService.getPinCountByResourceId).toHaveBeenCalledWith(
        resourceId,
      );

      expect(result.id).toBe(resourceId);
      expect(result.meta).toBeDefined();
      expect(result.meta!.groupName).toBe('Group 1');
      expect(result.pins.data).toHaveLength(1);
      expect(result.pins.pagination.totalItems).toBe(5);
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
      mockPinsService.getPinCountByResourceId.mockResolvedValue(0);

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
        type: 'pin',
        pins: expect.objectContaining({
          data: expect.any(Array),
          pagination: expect.objectContaining({
            currentPage: 1,
            totalItems: 1,
            itemsPerPage: 4,
          }),
        }),
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

  describe('sharePinResource - fromShared logic', () => {
    const collectionId = 'collection-1';
    const sharePinResourceDto = {
      sharedPinId: 'shared-pin-1',
      sourceMuralId: 'source-mural-1',
      additionalVariants: [],
    } as any;

    const mockCollection = {
      id: collectionId,
      mural: { userId: 'user-1', id: 'mural-1' },
      muralId: 'mural-1',
    };

    const mockSharedPin = {
      id: 'shared-pin-1',
      pinMeta: {
        firstPinId: 'first-pin-1',
        history: [],
      },
      resource: {
        collection: { muralId: 'source-mural-1' },
      },
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
        getRawOne: jest.fn().mockResolvedValue(null),
      })),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockDataSource.transaction.mockImplementation((cb) => cb(mockManager));
      mockManager.findOne
        .mockResolvedValueOnce(mockCollection) // collection
        .mockResolvedValueOnce(mockSharedPin); // shared pin
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

    it('should NOT call findVariants when own variants >= DEFAULT_ITEMS_LIMIT', async () => {
      const savedResource = { id: 'res-1', order: 'a1' };
      const savedPin = {
        id: 'pin-1',
        pinMeta: { sharedPinId: 'shared-pin-1', firstPinId: 'first-pin-1' },
        variants: [
          { id: 'v-1', order: 'a0', config: {} },
          { id: 'v-2', order: 'a1', config: {} },
          { id: 'v-3', order: 'a2', config: {} },
          { id: 'v-4', order: 'a3', config: {} },
        ],
      };

      mockManager.save
        .mockResolvedValueOnce(savedResource)
        .mockResolvedValueOnce(savedPin);

      const result = await service.sharePinResource(
        collectionId,
        sharePinResourceDto,
      );

      expect(mockPinsService.findVariants).not.toHaveBeenCalled();
      expect(result.pins.data[0].fromShared).toBeUndefined();
    });

    it('should call findVariants with correct remaining count when own variants < DEFAULT_ITEMS_LIMIT', async () => {
      const savedResource = { id: 'res-1', order: 'a1' };
      const savedPin = {
        id: 'pin-1',
        pinMeta: { sharedPinId: 'shared-pin-1', firstPinId: 'first-pin-1' },
        variants: [{ id: 'v-1', order: 'a0', config: {} }], // Only 1 variant, less than DEFAULT_ITEMS_LIMIT (4)
      };

      const mockSharedVariantsResult = {
        variants: [
          { id: 'shared-v-1', order: 'b0', config: {} },
          { id: 'shared-v-2', order: 'b1', config: {} },
        ],
        pagination: {
          currentPage: 1,
          totalItems: 10,
          itemsPerPage: 3,
        },
      };

      mockManager.save
        .mockResolvedValueOnce(savedResource)
        .mockResolvedValueOnce(savedPin);
      mockPinsService.findVariants.mockResolvedValue(mockSharedVariantsResult);

      const result = await service.sharePinResource(
        collectionId,
        sharePinResourceDto,
      );

      // Should call with remaining = 4 - 1 = 3
      expect(mockPinsService.findVariants).toHaveBeenCalledWith(
        'shared-pin-1',
        { page: 1, limit: 3 },
      );

      // Should include fromShared with nested variants structure
      expect(result.pins.data[0].fromShared).toBeDefined();
      expect(result.pins.data[0].fromShared?.variants.data).toHaveLength(2);
      expect(
        result.pins.data[0].fromShared?.variants.pagination.totalItems,
      ).toBe(10);
    });
  });
});
