import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { VariantEntity } from './variant.entity';
import { STATUSES } from 'src/common/constants/statuses.constant';
import { Status } from 'src/common/types/status.type';

@Entity('pins')
export class PinEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CollectionEntity, (collection) => collection.pins, {
    nullable: false,
  })
  @JoinColumn()
  collection: CollectionEntity;

  @Column('uuid')
  collectionId: string;

  @OneToMany(() => VariantEntity, (variant) => variant.pin, {
    cascade: true,
    eager: true,
  })
  variants: VariantEntity[];

  @Column({
    type: 'enum',
    enum: STATUSES,
    default: 'active',
  })
  status: Status;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: '0',
  })
  order: string;
}
