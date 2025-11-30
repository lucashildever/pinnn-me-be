import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PinEntity } from './pin.entity';

@Entity('pin_meta')
export class PinMetaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  sharedPinId: string;

  @Column({ type: 'uuid', nullable: true })
  firstPinId: string;

  @Column('json', { nullable: false })
  history: { sourceMuralId: string; order: number }[] = [];

  @OneToOne(() => PinEntity, (pin) => pin.pinMeta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pin_id' })
  pin: PinEntity;
}
