import {
  Column,
  Entity,
  OneToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { Transaction } from './transaction.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('billing_info')
export class BillingInfo extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => Transaction, (transaction) => transaction.billingInfo)
  transactions?: Transaction[];

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @Column({ unique: true })
  userId: string;

  @Column()
  fullName: string;

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

  // Stripe
  @Column({ nullable: true })
  stripeCustomerId?: string; // cus_xxx

  @Column({ nullable: true })
  defaultPaymentMethodId?: string; // pm_xxx

  @Column({ nullable: true, default: 'BRL' })
  currency: string;

  // For taxes (CPF/CNPJ/VAT etc)
  @Column({ nullable: true })
  taxId?: string;
}
