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
import { CreatePinResourceDto } from './dto/create-pin-resource.dto';

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

    mockEntityManager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as any;

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
});
