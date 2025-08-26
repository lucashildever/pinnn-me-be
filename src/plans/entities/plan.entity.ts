import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';

import { PlanStatus } from '../enums/plan-status.enum';
import { PlanType } from '../enums/plan-type.enum';

@Entity('plans')
export class Plan extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: PlanType,
    unique: true,
  })
  type: PlanType;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ type: 'json' })
  features: string[];

  @Column({ type: 'json' })
  limits: Record<string, any>;

  @Column({ nullable: true })
  monthlyStripePriceId?: string;

  @Column({ nullable: true })
  yearlyStripePriceId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyPrice?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  yearlyPrice?: number;

  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.DRAFT,
  })
  status: PlanStatus;
}
