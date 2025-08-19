import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { BillingInfo } from './billing-info.entity';

import { TransactionStatus } from '../enums/transaction-status.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { PlanType } from 'src/plans/enums/plan-type.enum';

@Entity('transactions')
export class Transaction extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BillingInfo, (billingInfo) => billingInfo.transactions)
  @JoinColumn({ name: 'billingInfoId' })
  billingInfo?: BillingInfo;

  @Column()
  billingInfoId: string;

  @ManyToOne(() => Subscription, { eager: false })
  @JoinColumn({ name: 'subscriptionId' })
  subscription?: Subscription;

  @Column({ nullable: true })
  subscriptionId?: string;

  // Transaction data
  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  // Values
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'BRL' })
  currency: string;

  // Stripe
  @Column({ nullable: true })
  stripePaymentIntentId?: string; // pi_xxx

  @Column({ nullable: true })
  stripeInvoiceId?: string; // in_xxx

  // Plan type (to keep history)
  @Column({ nullable: true })
  planName?: string;

  @Column({
    type: 'enum',
    enum: PlanType,
    nullable: true,
  })
  planType?: PlanType;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;
}
