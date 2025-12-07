import { Test, TestingModule } from '@nestjs/testing';
import { PinsService } from './pins.service';
import { DataSource } from 'typeorm';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FractionalIndexingService } from 'src/common/services/fractional-indexing.service';
import { UpdatePinDto } from './dto/update-pin.dto';
import { VariantEntity } from './entities/variant.entity';
import { PinEntity } from './entities/pin.entity';

describe('PinsService', () => {
  let service: PinsService;
  let mockDataSource: any;
  let mockSubscriptionsService: any;
  let mockFractionalIndexingService: any;
  let mockManager: any;
  let mockPinRepository: any;

  beforeEach(async () => {
    mockManager = {
      delete: jest.fn(),
      update: jest.fn(),
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    // Need to chain mock return values for createQueryBuilder on manager
    mockManager.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    });

    mockPinRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      }),
    };

    mockDataSource = {
      query: jest.fn(),
      transaction: jest.fn((cb) => cb(mockManager)),
      getRepository: jest.fn().mockReturnValue(mockPinRepository),
    };

    mockSubscriptionsService = {
      validateSubscriptionLimits: jest.fn(),
    };

    mockFractionalIndexingService = {
      validateOrderSequence: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinsService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
        {
          provide: FractionalIndexingService,
          useValue: mockFractionalIndexingService,
        },
      ],
    }).compile();

    service = module.get<PinsService>(PinsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPinCountsByResourceIds', () => {
    it('should return empty Map when resourceIds is empty', async () => {
      const result = await service.getPinCountsByResourceIds([]);

      expect(result).toEqual(new Map());
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should return correct counts for multiple resources', async () => {
      const resourceIds = ['res-1', 'res-2', 'res-3'];
      mockDataSource.query.mockResolvedValue([
        { resource_id: 'res-1', total: '5' },
        { resource_id: 'res-2', total: '3' },
        { resource_id: 'res-3', total: '0' },
      ]);

      const result = await service.getPinCountsByResourceIds(resourceIds);

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("'res-1'"),
      );
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("'res-2'"),
      );
      expect(result.get('res-1')).toBe(5);
      expect(result.get('res-2')).toBe(3);
      expect(result.get('res-3')).toBe(0);
    });

    it('should handle resources with no pins (not in result)', async () => {
      const resourceIds = ['res-1', 'res-2'];
      mockDataSource.query.mockResolvedValue([
        { resource_id: 'res-1', total: '2' },
        // res-2 not in result because it has 0 pins
      ]);

      const result = await service.getPinCountsByResourceIds(resourceIds);

      expect(result.get('res-1')).toBe(2);
      expect(result.get('res-2')).toBeUndefined();
    });
  });

  describe('getPinCountByResourceId', () => {
    it('should return correct count for a single resource', async () => {
      mockDataSource.query.mockResolvedValue([{ total: '7' }]);

      const result = await service.getPinCountByResourceId('res-1');

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("'res-1'"),
      );
      expect(result).toBe(7);
    });

    it('should return 0 when no pins found', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getPinCountByResourceId('res-empty');

      expect(result).toBe(0);
    });
  });

  describe('update', () => {
    const pinId = 'pin-1';
    const userId = 'user-1';
    const mockPin = {
      id: pinId,
      variants: [
        { id: 'v1', config: { type: 'text' }, order: '0' },
        { id: 'v2', config: { type: 'link' }, order: '1' },
      ],
      resource: {
        collection: {
          mural: {
            userId,
          },
        },
      },
    };

    it('should throw NotFoundException if pin not found', async () => {
      mockPinRepository.createQueryBuilder().getOne.mockResolvedValue(null);

      await expect(service.update(pinId, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should successfuly update variants (add, remove, update)', async () => {
      // Setup mock return for initial fetch
      mockPinRepository.createQueryBuilder().getOne.mockResolvedValue(mockPin);

      // Setup mock return for re-fetch (after transaction)
      const updatedPin = { ...mockPin, variants: [{ id: 'v1' }, { id: 'v3' }] };
      mockManager.createQueryBuilder().getOne.mockResolvedValue(updatedPin);

      const dto: UpdatePinDto = {
        variants: [
          { id: 'v1', config: { type: 'text_updated' as any }, order: '0' }, // Update
          // v2 removed
          { config: { type: 'image' as any }, order: '2' }, // Add (no id)
        ],
      };

      await service.update(pinId, dto);

      expect(mockManager.delete).toHaveBeenCalledWith(VariantEntity, ['v2']);
      expect(mockManager.update).toHaveBeenCalledWith(VariantEntity, 'v1', {
        config: { type: 'text_updated' },
        order: '0',
      });
      expect(mockManager.save).toHaveBeenCalled(); // For v3
      expect(
        mockSubscriptionsService.validateSubscriptionLimits,
      ).toHaveBeenCalledWith(userId, 'variants_per_pin', 2);
    });

    it('should throw BadRequestException if resulted variants count < 1', async () => {
      mockPinRepository.createQueryBuilder().getOne.mockResolvedValue(mockPin);

      const dto: UpdatePinDto = {
        variants: [], // Remove all
      };

      await expect(service.update(pinId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if subscription limit exceeded', async () => {
      mockPinRepository.createQueryBuilder().getOne.mockResolvedValue(mockPin);

      mockSubscriptionsService.validateSubscriptionLimits.mockRejectedValue(
        new BadRequestException('Limit exceeded'),
      );

      const dto: UpdatePinDto = {
        variants: [
          { id: 'v1', config: {} as any },
          { id: 'v2', config: {} as any },
          { config: {} as any }, // Add one, making total 3
        ],
      };

      await expect(service.update(pinId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if order sequence is invalid', async () => {
      mockPinRepository.createQueryBuilder().getOne.mockResolvedValue(mockPin);
      mockFractionalIndexingService.validateOrderSequence.mockReturnValue(
        false,
      );

      const dto: UpdatePinDto = {
        variants: [{ id: 'v1', config: {} as any, order: '0' }],
      };

      await expect(service.update(pinId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(
        mockFractionalIndexingService.validateOrderSequence,
      ).toHaveBeenCalledWith(['0']);
    });
  });
});
