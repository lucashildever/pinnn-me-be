import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { PaymentMethod } from './payment-method.entity';
import { Invoice } from 'src/billings/entities/invoice.entity';

import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
export class Payment extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  stripePaymentIntentId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, { nullable: false })
  invoice: Invoice;

  @ManyToOne(() => PaymentMethod, (pm) => pm.payments, { nullable: true })
  paymentMethod?: PaymentMethod;
}
