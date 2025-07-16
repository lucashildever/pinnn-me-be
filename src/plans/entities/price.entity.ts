import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Plan } from './plan.entity';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';

@Entity('prices')
export class Price extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  planId: string;

  @ManyToOne(() => Plan, (plan) => plan.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan: Plan;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: 'monthly' })
  billingPeriod: string;

  @Column({ length: 3 }) // ISO 4217 currency codes (USD, BRL, EUR, etc.)
  currency: string;
}
