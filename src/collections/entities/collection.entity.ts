import {
  Column,
  Entity,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DisplayElementEntity } from 'src/common/entities/display-element.entity';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { MuralEntity } from '../../murals/entities/mural.entity';
import { ResourceEntity } from 'src/resources/entities/resource.entity';
import { STATUSES } from 'src/common/constants/statuses.constant';
import { Status } from 'src/common/types/status.type';

@Entity('collections')
export class CollectionEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MuralEntity, (muralEntity) => muralEntity.collections, {
    nullable: false,
  })
  @JoinColumn()
  mural: MuralEntity;

  @OneToMany(() => ResourceEntity, (resource) => resource.collection)
  resources: ResourceEntity[];

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
