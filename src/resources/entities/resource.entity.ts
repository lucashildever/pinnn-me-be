import {
  Index,
  Entity,
  Column,
  OneToOne,
  ManyToOne,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { PinEntity } from 'src/pins/entities/pin.entity';

import { STATUSES } from 'src/common/constants/statuses.constant';
import { Status } from 'src/common/types/status.type';
import { ResourceMetaEntity } from './resource-meta.entity';

@Entity('resources')
@Index(['collectionId', 'order'])
export class ResourceEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => ResourceMetaEntity, { cascade: true })
  @JoinColumn({ name: 'resource_meta_id' })
  resourceMeta: ResourceMetaEntity;

  @Column({ type: 'uuid' })
  collectionId: string;

  @ManyToOne(() => CollectionEntity, (collection) => collection.resources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'collection_id' })
  collection: CollectionEntity;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: '0',
  })
  order: string;

  @Column({
    type: 'enum',
    enum: STATUSES,
    default: 'active',
  })
  status: Status;

  @OneToMany(() => PinEntity, (pin) => pin.resource, {
    cascade: ['insert', 'update'],
    eager: true,
  })
  pins: PinEntity[];

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
