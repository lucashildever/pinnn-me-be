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
import { CollectionEntity } from 'src/collection/entities/collection.entity';
import { CardEntity } from './card.entity';
import { Status } from 'src/common/enums/status.enum';

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
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;

  @UpdateDateColumn({ type: 'timestamp' })
  deletedAt: Date;

  @Column({ nullable: false })
  order: string;
}
