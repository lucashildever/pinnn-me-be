import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Payment } from './payment.entity';

import { PaymentMethodType } from '../enums/payment-method-type.enum';

@Entity('payment_methods')
export class PaymentMethod extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.paymentMethods, {
    nullable: false,
  })
  user: UserEntity;

  @OneToMany(() => Payment, (payment) => payment.paymentMethod)
  payments: Payment[];

  @Column({ type: 'enum', enum: PaymentMethodType })
  type: PaymentMethodType;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ nullable: false })
  stripePaymentMethodId: string; // (pm_xxx)

  @Column({ nullable: true })
  last4?: string; // when it uses card as payment method

  @Column({ nullable: true })
  brand?: string; // ex: visa, mastercard
}
