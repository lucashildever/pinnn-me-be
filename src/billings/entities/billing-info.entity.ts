import {
  Column,
  Entity,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { PaymentMethod } from 'src/payments/entities/payment-method.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Invoice } from './invoice.entity';

@Entity('billing_info')
export class BillingInfo extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PaymentMethod, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'default_payment_method_id' })
  defaultPaymentMethod?: PaymentMethod;

  @Column({ name: 'default_payment_method_id', nullable: true })
  defaultPaymentMethodId?: string;

  @OneToMany(() => Invoice, (invoice) => invoice.billingInfo)
  invoices?: Invoice[];

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @Column({ unique: true })
  userId: string;

  @Column()
  fullName: string;

  // Stripe
  @Column({ nullable: true })
  stripeCustomerId?: string; // cus_xxx

  @Column({ nullable: true, default: 'BRL' })
  currency: string;

  // For taxes (CPF/CNPJ/VAT etc)
  @Column({ nullable: true })
  taxId?: string;

  // Address info
  @Column({ nullable: true })
  addressStreet?: string;

  @Column({ nullable: true })
  addressCity?: string;

  @Column({ nullable: true })
  addressState?: string;

  @Column({ nullable: true })
  addressZipCode?: string;

  @Column({ nullable: true, default: 'BR' })
  addressCountry: string;
}
