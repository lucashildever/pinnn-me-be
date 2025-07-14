import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PinEntity } from './pin.entity';
import { CardConfig } from '../types/card-config.type';

@Entity('cards')
export class CardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PinEntity, (pinEntity) => pinEntity.cards, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  pin: PinEntity;

  @Column('uuid')
  pinId: string;

  @Column({
    type: 'varchar',
    length: 500,
    charset: 'utf8mb4',
    nullable: false,
  })
  caption: string;

  @Column({
    type: 'json',
    nullable: false,
  })
  cardConfig: CardConfig;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: '0',
  })
  order: string;
}
