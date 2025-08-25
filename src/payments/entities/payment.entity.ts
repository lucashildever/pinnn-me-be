import {
  Entity,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { PaymentAttempt } from './payment-attempt.entity';
import { PaymentMethod } from './payment-method.entity';
import { Invoice } from 'src/billings/entities/invoice.entity';

import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
export class Payment extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  stripePaymentIntentId?: string;

  @Column({ nullable: true, unique: true })
  stripeChargeId?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  currency?: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.SUCCEEDED,
  })
  status: PaymentStatus;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  invoice: Invoice;

  @ManyToOne(() => PaymentMethod, (pm) => pm.payments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  paymentMethod?: PaymentMethod;

  @OneToOne(() => PaymentAttempt, { nullable: true })
  @JoinColumn()
  originAttempt?: PaymentAttempt; // the successful "PaymentAttempt" that originated this "Payment"

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}
