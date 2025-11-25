import {
  Index,
  Entity,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { ResourceTypes } from '../constants/resource-types.constant';
import { ResourceType } from '../types/resource-type.type';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { PinEntity } from 'src/pins/entities/pin.entity';
import { PinGroupEntity } from 'src/pins/entities/pin-group.entity';

@Entity('resources')
export class ResourceEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ResourceTypes,
  })
  type: ResourceType;

  @ManyToOne(() => CollectionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collectionId' })
  @Index()
  collection: CollectionEntity;

  @Column('uuid')
  collectionId: string;

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

  @Column('uuid', { nullable: true })
  pinId: string;

  // For 'pin-group' and 'shared-pin-group' types
  @OneToOne(() => PinGroupEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pinGroupId' })
  pinGroup: PinGroupEntity;

  @Column('uuid', { nullable: true })
  pinGroupId: string;
}
