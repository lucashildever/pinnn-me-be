import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  OneToOne,
} from 'typeorm';
import { DisplayElementEntity } from 'src/common/entities/display-element.entity';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { MuralEntity } from '../../mural/entities/mural.entity';
import { PinEntity } from 'src/pin/entities/pin.entity';
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

  @OneToOne(() => DisplayElementEntity, {
    cascade: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  displayElement: DisplayElementEntity;

  @Column({ type: 'uuid' })
  displayElementId: string;

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

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: '0',
  })
  order: string;
}
