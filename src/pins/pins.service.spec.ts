import { Test, TestingModule } from '@nestjs/testing';
import { PinsService } from './pins.service';
import { DataSource } from 'typeorm';

describe('PinsService', () => {
  let service: PinsService;
  let mockDataSource: any;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
      transaction: jest.fn((cb) => cb({} as any)),
      getRepository: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinsService,
        {
          provide: DataSource,
          useValue: mockDataSource,
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
});
