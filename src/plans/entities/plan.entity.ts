import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { Price } from './price.entity';

import { PlanStatus } from '../enums/plan-status.enum';
import { PlanType } from '../enums/plan-type.enum';

@Entity('plans')
export class Plan extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: PlanType,
    unique: true, // Only 1 plan of each type
  })
  type: PlanType;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ type: 'json' })
  features: string[];

  @Column({ type: 'json' })
  limits: Record<string, any>;

  @OneToMany(() => Price, (price) => price.plan, { cascade: true })
  prices: Price[];

  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.DRAFT,
  })
  status: PlanStatus;
}
