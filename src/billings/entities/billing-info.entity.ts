import {
  Column,
  Entity,
  OneToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { Invoice } from './invoice.entity';

@Entity('billing_info')
export class BillingInfo extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => Invoice, (invoice) => invoice.billingInfo)
  invoices?: Invoice[];

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @Column({ unique: true })
  userId: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  stripeCustomerId?: string;

  @Column({ nullable: true, default: 'BRL' })
  currency: string;
}
