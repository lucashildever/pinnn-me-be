import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { PlansService } from 'src/plans/plans.service';
import { Repository, EntityManager } from 'typeorm';
import { SubscriptionStatus } from './types/subscription-status.type';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,

    private readonly plansService: PlansService,
  ) {}

  async handleSubscriptionChange(data: {
    userId: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    status: string;
    currentPeriodEnd: Date;
  }): Promise<Subscription> {
    const plan = await this.plansService.findByStripePriceId(
      data.stripePriceId,
    );

    if (!plan) {
      throw new Error(
        `Plan not found for stripe price id: ${data.stripePriceId}`,
      );
    }

    let subscription = await this.subscriptionsRepository.findOne({
      where: { stripeSubscriptionId: data.stripeSubscriptionId },
    });

    if (!subscription) {
      // Check if user already has a subscription to avoid duplicates if logic demands,
      // but for webhook handling, we usually trust the ID.
      // However, if we want to enforce 1 active sub per user locally:
      const existing = await this.findUserActiveSubscription(data.userId);
      if (
        existing &&
        existing.stripeSubscriptionId !== data.stripeSubscriptionId
      ) {
        // Handle edge case: User switched subs but we didn't get the cancel event yet?
        // Or just update the existing one?
        // For MVP, let's assume we create a new one or update the found one.
        // Let's create new if not found by stripeId.
        subscription = this.subscriptionsRepository.create({
          userId: data.userId,
          stripeSubscriptionId: data.stripeSubscriptionId,
        });
      } else if (!existing) {
        subscription = this.subscriptionsRepository.create({
          userId: data.userId,
          stripeSubscriptionId: data.stripeSubscriptionId,
        });
      } else {
        subscription = existing;
      }
    }

    subscription.plan = plan;
    subscription.planId = plan.id; // Explicitly set planId for the column
    subscription.status = data.status as SubscriptionStatus;

    // Enforce 1 active subscription per user (MVP Rule)
    // If this subscription is active, cancel all others for this user.
    if (subscription.status === 'active') {
      const activeSubs = await this.subscriptionsRepository.find({
        where: { userId: data.userId, status: 'active' },
      });

      for (const sub of activeSubs) {
        // Skip the one we are currently processing
        if (sub.stripeSubscriptionId !== data.stripeSubscriptionId) {
          sub.status = 'canceled';
          await this.subscriptionsRepository.save(sub);
        }
      }
    }

    // Ensure startAt is set for new subscriptions
    if (!subscription.startAt) {
      subscription.startAt = new Date();
    }

    // Validate date
    if (data.currentPeriodEnd && !isNaN(data.currentPeriodEnd.getTime())) {
      subscription.currentPeriodEnd = data.currentPeriodEnd;
    } else {
      // Fallback or leave as is if update
      if (!subscription.currentPeriodEnd) {
        subscription.currentPeriodEnd = new Date(); // Default to now if missing? Or handle error
      }
    }

    // Ensure userId is set (if we found by stripeId, it might be set, if new, we set it)
    if (!subscription.userId) subscription.userId = data.userId;

    return this.subscriptionsRepository.save(subscription);
  }

  /**
   * Subscribe a new user to the default (FREE) plan.
   * This should be called during user registration/account creation.
   */
  async subscribeToDefault(
    userId: string,
    manager?: EntityManager,
  ): Promise<Subscription> {
    const existingSubscription = await this.findUserActiveSubscription(userId);

    if (existingSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    const defaultPlan = await this.plansService.findDefaultPlan();

    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 10);

    const subscription = this.subscriptionsRepository.create({
      userId,
      planId: defaultPlan.id,
      status: 'active',
      startAt: new Date(),
      currentPeriodEnd: farFuture,
    });

    if (manager) {
      return manager.save(Subscription, subscription);
    }

    return this.subscriptionsRepository.save(subscription);
  }

  async findUserActiveSubscription(
    userId: string,
  ): Promise<Subscription | null> {
    const activeStatuses = ['active', 'past-due', 'trialing'];

    return this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.userId = :userId', { userId })
      .andWhere('subscription.status IN (:...activeStatuses)', {
        activeStatuses,
      })
      .orderBy('subscription.createdAt', 'DESC')
      .getOne();
  }

  async findUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.userId = :userId', { userId })
      .orderBy('subscription.createdAt', 'DESC')
      .getMany();
  }

  async findSubscriptionById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.id = :id', { id })
      .getOne();

    if (!subscription) {
      throw new NotFoundException('Inscrição não encontrada');
    }

    return subscription;
  }

  async findByBillingProviderId(
    billingProviderId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.billingProviderId = :billingProviderId', {
        billingProviderId,
      })
      .getOne();
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({
      where: { stripeSubscriptionId },
    });
  }

  async hasProAccess(userId: string): Promise<boolean> {
    const subscription = await this.findUserActiveSubscription(userId);

    if (!subscription) return false;

    return !!subscription.hasValidAccess() && !!subscription.isPro();
  }

  async findUserPlanType(userId: string): Promise<string> {
    const subscription = await this.findUserActiveSubscription(userId);

    if (!subscription || !subscription.hasValidAccess()) {
      return 'free';
    }

    return subscription.isPro() ? 'pro' : 'free';
  }

  async validateProAccess(userId: string): Promise<void> {
    const hasAccess = await this.hasProAccess(userId);

    if (!hasAccess) {
      throw new BadRequestException('Usuário não possui acesso PRO ativo');
    }
  }

  async getPlanFeatures(userId: string): Promise<string[]> {
    const subscription = await this.findUserActiveSubscription(userId);

    if (!subscription || !subscription.plan) {
      const freePlan = await this.plansService.findByName('FREE');
      return freePlan.features;
    }

    return subscription.plan.features;
  }

  async getSubscriptionStats(userId: string) {
    const subscription = await this.findUserActiveSubscription(userId);

    if (!subscription) {
      return {
        hasActiveSubscription: false,
        planType: 'free',
        isProUser: false,
        status: 'inactive',
        daysUntilExpiration: null,
        isExpiring: false,
      };
    }

    const daysUntilExpiration = subscription.daysUntilExpiration();

    return {
      hasActiveSubscription: subscription.hasValidAccess(),
      planType: subscription.isPro() ? 'pro' : 'free',
      isProUser: subscription.isPro(),
      status: subscription.status,
      daysUntilExpiration,
      isExpiring: subscription.isExpiringSoon(),
      startAt: subscription.startAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      isCancelled: subscription.isCancelled(),
    };
  }

  async validateSubscriptionLimits(
    userId: string,
    limitKey: string,
    valueToCheck: number,
    options?: {
      history?: { sourceMuralId: string; order: number }[];
      currentMuralId?: string;
    },
  ): Promise<void> {
    let limitValue: number | string;
    const subscription = await this.findUserActiveSubscription(userId);

    if (subscription?.plan) {
      const limits = subscription.plan.limits as Record<
        string,
        number | string
      >;
      if (
        typeof limits?.[limitKey] !== 'number' &&
        limits?.[limitKey] !== 'unlimited'
      ) {
        throw new NotFoundException(
          `Plan configuration error: ${subscription.plan.name} is missing ${limitKey} limit`,
        );
      }
      limitValue = limits[limitKey];
    } else {
      const freePlan = await this.plansService.findByName('free');
      const limits = freePlan.limits as Record<string, number | string>;
      if (
        typeof limits?.[limitKey] !== 'number' &&
        limits?.[limitKey] !== 'unlimited'
      ) {
        throw new NotFoundException(
          `Plan configuration error: free plan is missing ${limitKey} limit`,
        );
      }
      limitValue = limits[limitKey];
    }

    if (limitValue === 'unlimited') {
      return;
    }

    if (limitKey === 'own_mural_share_sequence') {
      if (!options?.history || !options?.currentMuralId) {
        throw new BadRequestException(
          'History and currentMuralId are required for own_mural_share_sequence validation',
        );
      }

      const sortedHistory = [...options.history].sort(
        (a, b) => b.order - a.order,
      );

      let consecutiveCount = 0;
      for (const item of sortedHistory) {
        if (item.sourceMuralId === options.currentMuralId) {
          consecutiveCount++;
        } else {
          break; // Stop counting when we find a different mural
        }
      }

      if (consecutiveCount >= (limitValue as number)) {
        throw new BadRequestException(
          `Limit exceeded: cannot share from your own mural more than ${limitValue} times in sequence.`,
        );
      }

      return;
    }

    if (valueToCheck > (limitValue as number)) {
      throw new BadRequestException(
        `Limit exceeded: cannot have more than ${limitValue} ${limitKey.replace(
          /_/g,
          ' ',
        )} in the current plan.`,
      );
    }
  }
}
