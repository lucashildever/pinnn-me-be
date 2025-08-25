import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { PaymentAttempt } from './payment-attempt.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Payment } from './payment.entity';

import { PaymentMethodType } from '../enums/payment-method-type.enum';

@Entity('payment_methods')
export class PaymentMethod extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.paymentMethods, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @OneToMany(() => Payment, (payment) => payment.paymentMethod)
  payments: Payment[];

  @OneToMany(() => PaymentAttempt, (attempt) => attempt.paymentMethod)
  attempts: PaymentAttempt[];

  @Column({ type: 'enum', enum: PaymentMethodType })
  type: PaymentMethodType;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ nullable: false, unique: true })
  stripePaymentMethodId: string;

  @Column({ nullable: true })
  last4?: string; // when it uses card as payment method

  @Column({ nullable: true })
  brand?: string; // ex: visa, mastercard

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}
