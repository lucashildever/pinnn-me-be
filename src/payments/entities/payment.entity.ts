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
import { Invoice } from 'src/billings/entities/invoice.entity';

import { PAYMENT_STATUSES } from '../constants/payment-statuses.constant';
import { PaymentStatus } from '../types/payment-status.type';

@Entity('payments')
export class Payment extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  stripeChargeId?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  currency?: string;

  @Column({
    type: 'enum',
    enum: PAYMENT_STATUSES,
    default: 'succeeded',
  })
  status: PaymentStatus;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn()
  invoice: Invoice;

  @Column()
  invoiceId: string;

  @OneToOne(() => PaymentAttempt, { nullable: true })
  @JoinColumn()
  originAttempt?: PaymentAttempt;

  @Column({ nullable: true })
  originAttemptId?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}
