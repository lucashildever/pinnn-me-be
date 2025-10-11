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

import { MURAL_PLANS } from '../constants/mural-plan.constant';
import { MuralPlan } from '../types/mural-plan.type';
import { STATUSES } from 'src/common/constants/statuses.constant';
import { Status } from 'src/common/types/status.type';

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
    enum: MURAL_PLANS,
    default: 'basic',
    nullable: false,
  })
  muralPlan: MuralPlan;

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
