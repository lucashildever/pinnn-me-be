import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { CollectionEntity } from '../../collections/entities/collection.entity';

import { CallToActionEntity } from './call-to-action.entity';

import { STATUSES } from 'src/common/constants/statuses.constant';
import { Status } from 'src/common/types/status.type';

import { PLAN_TYPES } from 'src/plans/constants/plan-types.constant';
import { PlanType } from 'src/plans/types/plan-type.type';

@Entity('murals')
export class MuralEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (userEntity) => userEntity.murals, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: UserEntity;

  @Column({ type: 'uuid' })
  userId: string;

  @OneToMany(() => CollectionEntity, (collection) => collection.mural)
  collections: CollectionEntity[];

  @Column({ unique: true, nullable: false })
  name: string;

  @Column({ nullable: false })
  displayName: string;

  @Column({
    default: 'No description for this mural yet',
  })
  description: string;

  @Column({
    name: 'mural_plan',
    type: 'enum',
    enum: PLAN_TYPES,
    default: 'free',
    nullable: false,
  })
  muralPlan: PlanType;

  @Column({
    type: 'enum',
    enum: STATUSES,
    default: 'active',
  })
  status: Status;

  @UpdateDateColumn({ type: 'timestamp' })
  deletedAt: Date;

  @OneToMany(() => CallToActionEntity, (cta) => cta.mural)
  ctas: CallToActionEntity[];
}
