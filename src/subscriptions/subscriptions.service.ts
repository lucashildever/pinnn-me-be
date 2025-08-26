import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Subscription } from './entities/subscription.entity';

import { SubscriptionStatus } from './enums/subscription-status.enum';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

import { PlansService } from 'src/plans/plans.service';

import Stripe from 'stripe';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,

    private readonly plansService: PlansService,
  ) {}

  async subscribe(createDto: CreateSubscriptionDto): Promise<Subscription> {
    await this.cancelUserActiveSubscriptions(createDto.userId);

    const planId = (
      await this.plansService.findPlanByName(createDto.planName, true)
    ).id;

    const subscription = this.subscriptionsRepository.create({
      userId: createDto.userId,
      planId: planId,
      status: SubscriptionStatus.ACTIVE,
      startAt: createDto.startAt || new Date(),
      currentPeriodEnd: createDto.currentPeriodEnd,
      billingProviderId: createDto.billingProviderId,
    });

    return this.subscriptionsRepository.save(subscription);
  }

  async findUserActiveSubscription(
    userId: string,
  ): Promise<Subscription | null> {
    const activeStatuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.PAST_DUE,
    ];

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
      .leftJoinAndSelect('plan.prices', 'prices')
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
      .leftJoinAndSelect('plan.prices', 'prices')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.billingProviderId = :billingProviderId', {
        billingProviderId,
      })
      .getOne();
  }

  async updateSubscription(
    id: string,
    updateDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.findSubscriptionById(id);

    Object.assign(subscription, updateDto);
    return this.subscriptionsRepository.save(subscription);
  }

  async activateSubscription(
    id: string,
    periodEnd?: Date,
  ): Promise<Subscription> {
    return this.updateSubscription(id, {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: periodEnd,
    });
  }

  async cancelSubscription(id: string): Promise<Subscription> {
    return this.updateSubscription(id, {
      status: SubscriptionStatus.CANCELLED,
    });
  }

  async reactivateSubscription(id: string): Promise<Subscription> {
    const newPeriodEnd = new Date();
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1); // +1 month

    return this.updateSubscription(id, {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: newPeriodEnd,
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

  async findSubscriptionsExpiringSoon(
    days: number = 7,
  ): Promise<Subscription[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .andWhere('subscription.currentPeriodEnd <= :futureDate', { futureDate })
      .andWhere('subscription.currentPeriodEnd > :now', { now: new Date() })
      .getMany();
  }

  async processExpiredSubscriptions(): Promise<{ processed: number }> {
    const now = new Date();

    const result = await this.subscriptionsRepository
      .createQueryBuilder()
      .update(Subscription)
      .set({ status: SubscriptionStatus.EXPIRED })
      .where('status = :activeStatus', {
        activeStatus: SubscriptionStatus.ACTIVE,
      })
      .andWhere('currentPeriodEnd <= :now', { now })
      .execute();

    return { processed: result.affected || 0 };
  }

  private async cancelUserActiveSubscriptions(userId: string): Promise<void> {
    const activeStatuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.PAST_DUE,
    ];

    await this.subscriptionsRepository
      .createQueryBuilder()
      .update(Subscription)
      .set({
        status: SubscriptionStatus.CANCELLED,
      })
      .where('userId = :userId', { userId })
      .andWhere('status IN (:...statuses)', { statuses: activeStatuses })
      .execute();
  }

  // TODO
  // atualizar nome para "status"
  // precisa verificar se há inscrição ativa no stripe, via PaymentsService
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

  async renewSubscription(
    id: string,
    periodInMonths: number = 1,
  ): Promise<Subscription> {
    const newPeriodEnd = new Date();
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + periodInMonths);

    return this.updateSubscription(id, {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: newPeriodEnd,
    });
  }
}
