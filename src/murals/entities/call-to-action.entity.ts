import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DisplayElementEntity } from 'src/common/entities/display-element.entity';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { MuralEntity } from './mural.entity';

import { CallToActionConfig } from '../types/call-to-action-config.type';

@Entity('call_to_actions')
export class CallToActionEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MuralEntity, (muralEntity) => muralEntity.ctas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  mural: MuralEntity;

  @Column({ type: 'uuid' })
  muralId: string;

  @ManyToOne(() => DisplayElementEntity, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  displayElement: DisplayElementEntity;

  @Column({ type: 'uuid' })
  displayElementId: string;

  @Column({
    type: 'json',
    nullable: false,
  })
  callToActionConfig: CallToActionConfig;
}
