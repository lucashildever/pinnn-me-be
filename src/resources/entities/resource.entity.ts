import {
  Index,
  Entity,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { ResourceTypes } from '../constants/resource-types.constant';
import { ResourceType } from '../types/resource-type.type';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { PinEntity } from 'src/pins/entities/pin.entity';
import { PinGroupEntity } from 'src/pins/entities/pin-group.entity';
import { STATUSES } from 'src/common/constants/statuses.constant';
import { Status } from 'src/common/types/status.type';

@Entity('resources')
export class ResourceEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ResourceTypes,
  })
  type: ResourceType;

  @Column({ type: 'uuid' })
  collectionId: string;

  @ManyToOne(() => CollectionEntity, (collection) => collection.resources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'collection_id' })
  @Index()
  collection: CollectionEntity;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: '0',
  })
  order: string;

  // For 'pin' and 'shared-pin' types
  @OneToOne(() => PinEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pinId' })
  pin: PinEntity;

  // For 'pin-group' and 'shared-pin-group' types
  @OneToOne(() => PinGroupEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pinGroupId' })
  pinGroup: PinGroupEntity;

  @Column({
    type: 'enum',
    enum: STATUSES,
    default: 'active',
  })
  status: Status;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
