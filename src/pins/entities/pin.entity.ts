import {
  Entity,
  Column,
  OneToMany,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { VariantEntity } from './variant.entity';
import { PinMetaEntity } from './pin-meta.entity';
import { ResourceEntity } from 'src/resources/entities/resource.entity';

@Entity('pins')
export class PinEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => PinMetaEntity, { cascade: true })
  @JoinColumn({ name: 'pin_meta_id' })
  pinMeta: PinMetaEntity;

  @ManyToOne(() => ResourceEntity, (resource) => resource.pins, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource: ResourceEntity;

  @Column({ type: 'uuid', nullable: true })
  resourceId: string;

  @OneToMany(() => VariantEntity, (variant) => variant.pin, {
    cascade: true,
    eager: true,
  })
  variants: VariantEntity[];

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  order: string;
}
