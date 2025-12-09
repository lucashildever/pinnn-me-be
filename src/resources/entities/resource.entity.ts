import {
  Index,
  Entity,
  Column,
  OneToOne,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { PinEntity } from 'src/pins/entities/pin.entity';

import { ResourceMetaEntity } from './resource-meta.entity';

@Entity('resources')
@Index(['collectionId', 'order'])
export class ResourceEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => ResourceMetaEntity, (resourceMeta) => resourceMeta.resource, {
    cascade: true,
  })
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

  @OneToMany(() => PinEntity, (pin) => pin.resource, {
    cascade: ['insert', 'update'],
  })
  pins: PinEntity[];
}
