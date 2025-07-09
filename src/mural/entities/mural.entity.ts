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
import { UserEntity } from 'src/user/entities/user.entity';
import { CollectionEntity } from '../../collection/entities/collection.entity';

import { MuralPlan } from '../enums/mural-plan.enum';
import { Status } from 'src/common/enums/status.enum';

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
    enum: MuralPlan,
    default: MuralPlan.BASIC,
    nullable: false,
  })
  muralPlan: MuralPlan;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;

  @UpdateDateColumn({ type: 'timestamp' })
  deletedAt: Date;
}
