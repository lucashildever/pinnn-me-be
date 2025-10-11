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
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { CardEntity } from './card.entity';
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

  @OneToMany(() => CardEntity, (card) => card.pin, {
    cascade: true,
    eager: true,
  })
  cards: CardEntity[];

  @Column({
    type: 'text',
    charset: 'utf8mb4',
    nullable: true,
  })
  description: string;

  @Column({
    type: 'enum',
    enum: STATUSES,
    default: 'active',
  })
  status: Status;

  @UpdateDateColumn({ type: 'timestamp' })
  deletedAt: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: '0',
  })
  order: string;
}
