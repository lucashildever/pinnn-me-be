import { Repository } from 'typeorm';
import { Plan } from 'src/plans/entities/plan.entity';
import { PlanType } from 'src/plans/types/plan-type.type';
import { getPlansData } from './data/plans.data';
import { ConfigService } from '@nestjs/config';

export async function seedPlans(
  plansRepository: Repository<Plan>,
  configService: ConfigService,
) {
  try {
    const plansData = getPlansData(configService);

    for (const planData of plansData) {
      const exists = await plansRepository.findOne({
        where: { type: planData.type as PlanType },
      });

      if (!exists) {
        const plan = plansRepository.create({
          ...planData,
          type: planData.type as PlanType,
        });
        await plansRepository.save(plan);
        console.log(`Plan ${planData.name} created successfully`);
      } else {
        console.log(`Plan ${planData.name} already exists`);
      }
    }
  } catch (error) {
    console.error('Error seeding plans:', error);
    throw error;
  }
}
