import { Repository } from 'typeorm';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Plan } from 'src/plans/entities/plan.entity';
import { subscriptionsData } from './data/subscriptions.data';

export async function seedSubscriptions(
  subscriptionsRepository: Repository<Subscription>,
  usersRepository: Repository<UserEntity>,
  plansRepository: Repository<Plan>,
) {
  try {
    for (const data of subscriptionsData) {
      const user = await usersRepository.findOne({
        where: { email: data.userEmail },
      });

      if (!user) {
        console.warn(
          `User with email ${data.userEmail} not found. Skipping subscription seed.`,
        );
        continue;
      }

      const plan = await plansRepository.findOne({
        where: { name: data.planName },
      });

      if (!plan) {
        console.warn(
          `Plan with name ${data.planName} not found. Skipping subscription seed.`,
        );
        continue;
      }

      const existingSubscription = await subscriptionsRepository.findOne({
        where: { userId: user.id },
      });

      if (!existingSubscription) {
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 10);

        const subscription = subscriptionsRepository.create({
          userId: user.id,
          planId: plan.id,
          status: 'active',
          startAt: new Date(),
          currentPeriodEnd: farFuture,
        });

        await subscriptionsRepository.save(subscription);
        console.log(
          `Subscription for user ${data.userEmail} created successfully`,
        );
      } else {
        console.log(`Subscription for user ${data.userEmail} already exists`);
      }
    }
  } catch (error) {
    console.error('Error seeding subscriptions:', error);
    throw error;
  }
}
