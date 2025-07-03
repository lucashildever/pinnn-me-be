import {
  Check,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { MuralEntity } from '../../mural/entities/mural.entity';
import { PinEntity } from 'src/pin/entities/pin.entity';

import { TabType } from '../enums/tab-type.enum';
import { Status } from 'src/common/enums/status.enum';

@Entity('collections')
export class CollectionEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => PinEntity, (pinEntity) => pinEntity.collection)
  pins: PinEntity[];

  @ManyToOne(() => MuralEntity, (muralEntity) => muralEntity.collections, {
    nullable: false,
  })
  @JoinColumn()
  mural: MuralEntity;

  @Column({ type: 'uuid' })
  muralId: string;

  @Column({
    type: 'varchar',
    length: 15,
    charset: 'utf8mb4',
    nullable: false,
  })
  content: string;

  @Column({
    type: 'enum',
    nullable: false,
    enum: TabType,
    default: TabType.NONE,
  })
  type: TabType;

  @Column({
    type: 'varchar',
    length: 1000,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  icon: string;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
  })
  isMain: boolean;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;

  @UpdateDateColumn({ type: 'timestamp' })
  deletedAt: Date;

  @Column({ nullable: false })
  order: string;
}
