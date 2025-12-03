import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { PlansService } from 'src/plans/plans.service';
import { Repository } from 'typeorm';
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
    subscription.status = data.status as SubscriptionStatus;
    subscription.currentPeriodEnd = data.currentPeriodEnd;
    // Ensure userId is set (if we found by stripeId, it might be set, if new, we set it)
    if (!subscription.userId) subscription.userId = data.userId;

    return this.subscriptionsRepository.save(subscription);
  }

  /**
   * Subscribe a new user to the default (FREE) plan.
   * This should be called during user registration/account creation.
   */
  async subscribeToDefault(userId: string): Promise<Subscription> {
    const existingSubscription = await this.findUserActiveSubscription(userId);

    if (existingSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    const defaultPlan = await this.plansService.findDefaultPlan();

    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 100);

    const subscription = this.subscriptionsRepository.create({
      userId,
      planId: defaultPlan.id,
      status: 'active',
      startAt: new Date(),
      currentPeriodEnd: farFuture,
    });

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
}
