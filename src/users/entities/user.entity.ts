import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { MuralEntity } from 'src/murals/entities/mural.entity';
import { Invoice } from 'src/billings/entities/invoice.entity';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';

import { ROLES } from '../../auth/constants/roles.constant';
import { Role } from '../../auth/types/role.type';

import { STATUSES } from 'src/common/constants/statuses.constant';
import { Status } from 'src/common/types/status.type';

@Entity('users')
export class UserEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => MuralEntity, (muralEntity) => muralEntity.user)
  murals: MuralEntity[];

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions?: Subscription[];

  @OneToMany(() => Invoice, (invoice) => invoice.user)
  invoices: Invoice[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @Column({ type: 'uuid', nullable: true })
  activeMuralId: string | null;

  @ManyToOne(() => MuralEntity, { nullable: true })
  @JoinColumn({ name: 'activeMuralId' })
  activeMural: MuralEntity | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  username: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 80,
    nullable: false,
  })
  password: string;

  @Column({
    type: 'enum',
    enum: ROLES,
    default: 'user',
  })
  role: Role;

  @Column({
    type: 'enum',
    enum: STATUSES,
    default: 'active',
  })
  status: Status;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
