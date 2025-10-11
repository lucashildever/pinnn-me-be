import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { PLAN_TYPES } from '../constants/plan-types.constant';
import { PlanType } from '../types/plan-type.type';

@Entity('plans')
export class Plan extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: PLAN_TYPES,
    unique: true,
  })
  type: PlanType;

  @Column({ default: false })
  isDefault: boolean; // FREE plan = true

  @Column({ type: 'json' })
  features: string[];

  @Column({ type: 'json' })
  limits: Record<string, any>;

  @Column({ nullable: true })
  monthlyStripePriceId?: string; // null for FREE

  @Column({ nullable: true })
  yearlyStripePriceId?: string; // null for FREE
}
