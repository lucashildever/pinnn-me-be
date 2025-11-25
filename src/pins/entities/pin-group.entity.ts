import {
  Entity,
  Column,
  ManyToMany,
  JoinTable,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { PinEntity } from 'src/pins/entities/pin.entity';

@Entity('pin_groups')
export class PinGroupEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  name: string;

  @ManyToMany(() => PinEntity)
  @JoinTable({
    name: 'pin_group_pins',
    joinColumn: { name: 'pinGroupId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'pinId', referencedColumnName: 'id' },
  })
  pins: PinEntity[];
}
