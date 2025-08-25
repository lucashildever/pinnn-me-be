import {
  Column,
  Entity,
  OneToOne,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { PaymentMethod } from './payment-method.entity';
import { Invoice } from 'src/billings/entities/invoice.entity';
import { Payment } from './payment.entity';

import { PaymentAttemptStatus } from '../enums/payment-attempt-status.enum';

@Entity('payment_attempts')
export class PaymentAttempt extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  stripeSessionId?: string;

  @Column({ nullable: true, unique: true })
  stripePaymentIntentId?: string;

  @Column({ nullable: true })
  stripeChargeId?: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  amount?: number;

  @Column({ nullable: true })
  currency?: string;

  @Column({
    type: 'enum',
    enum: PaymentAttemptStatus,
    default: PaymentAttemptStatus.PENDING,
  })
  status: PaymentAttemptStatus;

  @ManyToOne(() => Invoice, (invoice) => invoice.paymentAttempts, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  invoice: Invoice;

  @ManyToOne(() => PaymentMethod, (pm) => pm.attempts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  paymentMethod?: PaymentMethod;

  @OneToOne(() => Payment, (payment) => payment.originAttempt, {
    nullable: true,
  })
  payment?: Payment; // when a "PaymentAttempt" is successful, a "Payment" should be created

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}
