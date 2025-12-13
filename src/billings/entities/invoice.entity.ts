import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { BillingInfo } from './billing-info.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Payment } from 'src/payments/entities/payment.entity';

import { INVOICE_STATUSES } from '../constants/invoice-status.constant';
import { InvoiceStatus } from '../types/invoice-status.type';
import { INVOICE_TYPES } from '../constants/invoice-types.constant';
import { InvoiceType } from '../types/invoice-type.type';
import { PlanType } from 'src/plans/types/plan-type.type';
import { PLAN_TYPES } from 'src/plans/constants/plan-types.constant';

@Entity('invoices')
export class Invoice extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.invoices, { nullable: false })
  @JoinColumn()
  user: UserEntity;

  @Column()
  userId: string;

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments?: Payment[];

  @ManyToOne(() => BillingInfo, (billingInfo) => billingInfo.invoices)
  @JoinColumn()
  billingInfo?: BillingInfo;

  @Column()
  billingInfoId: string;

  @ManyToOne(() => Subscription, { eager: false })
  @JoinColumn()
  subscription?: Subscription;

  @Column({ nullable: true })
  subscriptionId?: string;

  @Column({
    type: 'enum',
    enum: INVOICE_TYPES,
  })
  type: InvoiceType;

  @Column({
    type: 'enum',
    enum: INVOICE_STATUSES,
    default: 'pending',
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

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;
}
