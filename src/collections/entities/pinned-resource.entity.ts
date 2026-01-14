import {
  Index,
  Entity,
  Column,
  Unique,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { CollectionEntity } from './collection.entity';
import { ResourceEntity } from 'src/resources/entities/resource.entity';

@Entity('pinned_resources')
@Index(['collectionId', 'order'])
@Unique(['collectionId', 'resourceId'])
export class PinnedResourceEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  collectionId: string;

  @ManyToOne(() => CollectionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collection_id' })
  collection: CollectionEntity;

  @Column({ type: 'uuid' })
  resourceId: string;

  @ManyToOne(() => ResourceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: ResourceEntity;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: '0',
  })
  order: string;
}
