import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Plan } from './entities/plan.entity';

import { PlanResponseDto } from './dto/plan-response.dto';
import { CreatePlanDto } from './dto/create-plan.dto';

import { PlanStatus } from './enums/plan-status.enum';
import { PlanType } from './enums/plan-type.enum';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
  ) {}

  async createPlan(createPlanDto: CreatePlanDto): Promise<PlanResponseDto> {
    if (createPlanDto.type === PlanType.PRO) {
      if (
        !createPlanDto.monthlyStripePriceId &&
        !createPlanDto.yearlyStripePriceId
      ) {
        throw new BadRequestException(
          'At least one Stripe Price ID (monthly or yearly) must be provided for PRO plans',
        );
      }
    }

    const existingPlan = await this.plansRepository.findOne({
      where: { type: createPlanDto.type },
    });

    if (existingPlan) {
      throw new BadRequestException(
        `There is already a ${createPlanDto.type} plan`,
      );
    }

    if (createPlanDto.isDefault) {
      const defaultPlan = await this.plansRepository.findOne({
        where: { isDefault: true },
      });

      if (defaultPlan) {
        throw new BadRequestException(
          'A default plan already exists. Set isDefault to false or remove the existing default plan',
        );
      }
    }

    const plan = this.plansRepository.create(createPlanDto);
    const savedPlan = await this.plansRepository.save(plan);

    return this.mapPlanToResponse(savedPlan);
  }

  async findAllPlans(): Promise<PlanResponseDto[]> {
    const plans = await this.plansRepository.find();
    return plans.map((p) => this.mapPlanToResponse(p));
  }

  async findByIdOrFail(id: string, active: boolean): Promise<PlanResponseDto> {
    const where: any = { id };
    if (active) {
      where.status = PlanStatus.ACTIVE;
    }

    const plan = await this.plansRepository.findOne({
      where,
      relations: ['prices'],
    });

    if (!plan) {
      throw new BadRequestException('Plan not found');
    }

    return this.mapPlanToResponse(plan);
  }

  async findPlanByName(
    name: string,
    active: boolean,
  ): Promise<PlanResponseDto> {
    const where: any = { name };

    if (active) {
      where.status = PlanStatus.ACTIVE;
    }

    const plan = await this.plansRepository.findOne({
      where,
      relations: ['prices'],
    });

    if (!plan) {
      throw new BadRequestException('Plan not found');
    }

    return this.mapPlanToResponse(plan);
  }

  async findByStripePriceId(stripePriceId: string): Promise<Plan> {
    const plan = await this.plansRepository.findOne({
      where: [
        { monthlyStripePriceId: stripePriceId },
        { yearlyStripePriceId: stripePriceId },
      ],
    });

    if (!plan) {
      throw new Error(
        `Plan not found for this stripePriceId: ${stripePriceId}`,
      );
    }

    return plan;
  }

  private mapPlanToResponse(plan: Plan): PlanResponseDto {
    return {
      id: plan.id,
      name: plan.name,
      type: plan.type,
      isDefault: plan.isDefault,
      features: plan.features,
      limits: plan.limits,
      prices: [
        ...(plan.monthlyStripePriceId
          ? [
              {
                billingPeriod: 'monthly' as const,
                stripePriceId: plan.monthlyStripePriceId,
              },
            ]
          : []),
        ...(plan.yearlyStripePriceId
          ? [
              {
                billingPeriod: 'yearly' as const,
                stripePriceId: plan.yearlyStripePriceId,
              },
            ]
          : []),
      ],
    };
  }
}
