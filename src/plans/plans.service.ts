import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Price } from './entities/price.entity';
import { Plan } from './entities/plan.entity';

import { PlanResponseDto } from './dto/plan-response.dto';
import { CreatePlanDto } from './dto/create-plan.dto';

import { PlanStatus } from './enums/plan-status.enum';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
    @InjectRepository(Price)
    private readonly pricesRepository: Repository<Price>,
  ) {}

  async createPlan(createPlanDto: CreatePlanDto): Promise<PlanResponseDto> {
    const { prices: pricesData, ...planData } = createPlanDto;

    if (!pricesData || pricesData.length === 0) {
      throw new BadRequestException('At least one price must be provided');
    }

    const existingPlan = await this.plansRepository.findOne({
      where: { slug: planData.slug },
    });

    if (existingPlan) {
      throw new BadRequestException('There is already a plan with this slug');
    }

    if (planData.isDefault) {
      const defaultPlan = await this.plansRepository.findOne({
        where: { isDefault: true },
      });

      if (defaultPlan) {
        throw new BadRequestException(
          'A default plan already exists. Set isDefault to false or remove the existing default plan',
        );
      }
    }

    const plan = this.plansRepository.create(planData);
    const savedPlan = await this.plansRepository.save(plan);

    const priceEntities = pricesData.map((pd) => {
      const price = this.pricesRepository.create(pd);
      price.plan = savedPlan;
      price.planId = savedPlan.id;
      return price;
    });

    await this.pricesRepository.save(priceEntities);

    const planWithPrices = await this.plansRepository.findOne({
      where: { id: savedPlan.id },
      relations: ['prices'],
    });

    if (!planWithPrices) {
      throw new BadRequestException(
        'Error while trying to retrieve created plan',
      );
    }

    return this.mapPlanToResponse(planWithPrices);
  }

  async findAllPlans(onlyActivePlans: boolean): Promise<PlanResponseDto[]> {
    const where = onlyActivePlans ? { status: PlanStatus.ACTIVE } : {};

    const plans = await this.plansRepository.find({
      relations: ['prices'],
      where,
    });

    return plans.map((p) => this.mapPlanToResponse(p));
  }

  async findPlanById(
    id: string,
    onlyActivePlans: boolean,
  ): Promise<PlanResponseDto> {
    const where: any = { id };
    if (onlyActivePlans) {
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

  async findPlanBySlug(
    slug: string,
    onlyActivePlans: boolean,
  ): Promise<PlanResponseDto> {
    const where: any = { slug };
    if (onlyActivePlans) {
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

  private mapPlanToResponse(plan: Plan): PlanResponseDto {
    return {
      name: plan.name,
      slug: plan.slug,
      isDefault: plan.isDefault,
      features: plan.features,
      limits: plan.limits,
      prices: (plan.prices || []).map((p) => ({
        price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
        billingPeriod: p.billingPeriod,
        currency: p.currency,
      })),
    };
  }
}
