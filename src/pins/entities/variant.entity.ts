import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PinEntity } from './pin.entity';

import { VariantConfigDto } from '../dto/variant/variant-config.dto';

@Entity('variants')
export class VariantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PinEntity, (pinEntity) => pinEntity.variants, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  pin: PinEntity;

  @Column('uuid')
  pinId: string;

  @Column({
    type: 'json',
    nullable: false,
  })
  config: VariantConfigDto;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: '0',
  })
  order: string;
}
