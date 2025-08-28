import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { PaymentAttempt } from 'src/payments/entities/payment-attempt.entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { BillingInfo } from './billing-info.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Payment } from 'src/payments/entities/payment.entity';

import { InvoiceStatus } from '../enums/invoice-status.enum';
import { InvoiceType } from '../enums/invoice-type.enum';
import { PlanType } from 'src/plans/enums/plan-type.enum';

@Entity('invoices')
export class Invoice extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.invoices, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  userId: string;

  @OneToMany(() => PaymentAttempt, (attempt) => attempt.invoice)
  paymentAttempts?: PaymentAttempt[];

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments?: Payment[];

  @ManyToOne(() => BillingInfo, (billingInfo) => billingInfo.invoices)
  @JoinColumn({ name: 'billingInfoId' })
  billingInfo?: BillingInfo;

  @Column()
  billingInfoId: string;

  @ManyToOne(() => Subscription, { eager: false })
  @JoinColumn({ name: 'subscriptionId' })
  subscription?: Subscription;

  @Column({ nullable: true })
  subscriptionId?: string;

  @Column({
    type: 'enum',
    enum: InvoiceType,
  })
  type: InvoiceType;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  // Values
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;
  // Amount in the moment of registration (ex: if user have a 15% discount
  // the amount will be different from the actual price)

  @Column({ default: 'BRL' })
  currency: string;

  @Column({ nullable: true })
  stripeInvoiceId?: string;

  @Column({ nullable: true })
  planName?: string; // Plan name in the moment of registration (ex: PlanType may change in the future)

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
