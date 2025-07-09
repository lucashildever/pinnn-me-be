import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CardType } from '../enums/card-type.enum';
import { PinEntity } from './pin.entity';

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
    type: 'enum',
    enum: CardType,
    nullable: false,
  })
  variantType: CardType;

  @Column({
    type: 'text',
    charset: 'utf8mb4',
    nullable: true,
  })
  link?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: '0',
  })
  order: string;
}
