import {
  Column,
  Entity,
  OneToOne,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { Invoice } from 'src/billings/entities/invoice.entity';
import { Payment } from './payment.entity';

import { PAYMENT_ATTEMPT_STATUSES } from '../constants/payment-attempt-status.constant';
import { PaymentAttemptStatus } from '../types/payment-attempt-status.type';

@Entity('payment_attempts')
export class PaymentAttempt extends TimestampEntity {
  // avaliar adicionar coluna "failure_reason"

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  stripeSessionId?: string;

  @Column({ nullable: true, unique: true })
  stripePaymentIntentId?: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  amount?: number;

  @Column({ nullable: true })
  currency?: string;

  @Column({
    type: 'enum',
    enum: PAYMENT_ATTEMPT_STATUSES,
    default: 'pending',
  })
  status: PaymentAttemptStatus;

  @ManyToOne(() => Invoice, (invoice) => invoice.paymentAttempts, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  invoice?: Invoice;

  @OneToOne(() => Payment, (payment) => payment.originAttempt, {
    nullable: true,
  })
  payment?: Payment; // when a "PaymentAttempt" is successful, a "Payment" should be created

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}
