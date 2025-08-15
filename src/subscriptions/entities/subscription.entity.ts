import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Plan } from 'src/plans/entities/plan.entity';

import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { PlanType } from 'src/plans/enums/plan-type.enum';

@Entity('subscriptions')
export class Subscription extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.subscriptions, { eager: false })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @Column()
  userId: string;

  @ManyToOne(() => Plan, { eager: false })
  @JoinColumn({ name: 'planId' })
  plan?: Plan;

  @Column()
  planId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.INCOMPLETE,
  })
  status: SubscriptionStatus;

  @Column({ type: 'timestamp', nullable: false })
  startAt: Date;

  @Column({ type: 'timestamp', nullable: false })
  currentPeriodEnd: Date;

  @Column({ nullable: true })
  billingProviderId?: string; // stripe subscription id

  // Métodos essenciais para MVP
  isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE && !this.isExpired();
  }

  isExpired(): boolean {
    const now = new Date();
    return this.currentPeriodEnd <= now;
  }

  isCancelled(): boolean {
    return [SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED].includes(
      this.status,
    );
  }

  hasValidAccess(): boolean {
    return this.isActive();
  }

  daysUntilExpiration(): number {
    if (!this.currentPeriodEnd) return -1;

    const today = new Date();
    const diffTime = this.currentPeriodEnd.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isExpiringSoon(days: number = 7): boolean {
    const daysUntilExp = this.daysUntilExpiration();
    return daysUntilExp > 0 && daysUntilExp <= days;
  }

  isPro(): boolean {
    if (!this.plan) return false;

    return this.plan.type === PlanType.PRO;
  }
}
