import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Price } from './entities/price.entity';
import { Plan } from './entities/plan.entity';

import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Price)
    private readonly priceRepository: Repository<Price>,
  ) {}

  async createPlan(createPlanDto: CreatePlanDto): Promise<Plan> {
    const { prices: pricesData, ...planData } = createPlanDto;

    if (!pricesData || pricesData.length === 0) {
      throw new BadRequestException('At least one price must be provided');
    }

    const existingPlan = await this.planRepository.findOne({
      where: { slug: planData.slug },
    });

    if (existingPlan) {
      throw new BadRequestException('There is already a plan with this slug');
    }

    if (planData.isDefault) {
      const defaultPlan = await this.planRepository.findOne({
        where: { isDefault: true },
      });

      if (defaultPlan) {
        throw new BadRequestException(
          'A default plan already exists. Set isDefault to false or remove the existing default plan',
        );
      }
    }

    const plan = this.planRepository.create(planData);
    const savedPlan = await this.planRepository.save(plan);

    const prices = pricesData.map((priceData) =>
      this.priceRepository.create({
        ...priceData,
        planId: savedPlan.id,
      }),
    );
    await this.priceRepository.save(prices);

    const planWithPrices = await this.planRepository.findOne({
      where: { id: savedPlan.id },
      relations: ['prices'],
    });

    if (!planWithPrices) {
      throw new BadRequestException(
        'Error while trying to retrieve created plan',
      );
    }

    return planWithPrices;
  }

  async findAllPlans(): Promise<Plan[]> {
    return await this.planRepository.find({
      relations: ['prices'],
    });
  }

  async findPlanById(id: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['prices'],
    });

    if (!plan) {
      throw new BadRequestException('Plan not found');
    }

    return plan;
  }

  async findPlanBySlug(slug: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({
      where: { slug },
      relations: ['prices'],
    });

    if (!plan) {
      throw new BadRequestException('Plan not found');
    }

    return plan;
  }
}
