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

@Entity('resources')
export class ResourceEntity extends TimestampEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: ResourceTypes,
    })
    type: ResourceType;

    @Column('uuid')
    @Index()
    collectionId: string;

    @ManyToOne(() => CollectionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'collectionId' })
    collection: CollectionEntity;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: false,
        default: '0',
    })
    order: string;

    @OneToOne(() => PinEntity, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn()
    pin: PinEntity;
}
