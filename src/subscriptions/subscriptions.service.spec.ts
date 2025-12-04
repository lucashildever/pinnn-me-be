import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { PlansService } from 'src/plans/plans.service';
import { BadRequestException } from '@nestjs/common';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let plansService: PlansService;

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  const mockPlansService = {
    findByStripePriceId: jest.fn(),
    findDefaultPlan: jest.fn(),
    findByName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: PlansService,
          useValue: mockPlansService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    plansService = module.get<PlansService>(PlansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateSubscriptionLimits', () => {
    it('should validate successfully when within limits', async () => {
      const userId = 'user-1';
      const limitKey = 'pins_per_group';
      const valueToCheck = 5;

      jest.spyOn(service, 'findUserActiveSubscription').mockResolvedValue({
        plan: {
          name: 'Pro',
          limits: { pins_per_group: 10 },
        },
      } as any);

      await expect(
        service.validateSubscriptionLimits(userId, limitKey, valueToCheck),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException when limit exceeded', async () => {
      const userId = 'user-1';
      const limitKey = 'pins_per_group';
      const valueToCheck = 15;

      jest.spyOn(service, 'findUserActiveSubscription').mockResolvedValue({
        plan: {
          name: 'Pro',
          limits: { pins_per_group: 10 },
        },
      } as any);

      await expect(
        service.validateSubscriptionLimits(userId, limitKey, valueToCheck),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use free plan limits if no active subscription', async () => {
      const userId = 'user-1';
      const limitKey = 'pins_per_group';
      const valueToCheck = 5;

      jest.spyOn(service, 'findUserActiveSubscription').mockResolvedValue(null);
      mockPlansService.findByName.mockResolvedValue({
        name: 'free',
        limits: { pins_per_group: 3 },
      });

      await expect(
        service.validateSubscriptionLimits(userId, limitKey, valueToCheck),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
