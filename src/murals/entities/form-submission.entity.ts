import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { CallToActionEntity } from './call-to-action.entity';

@Entity('form_submissions')
export class FormSubmissionEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CallToActionEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  callToAction: CallToActionEntity;

  @Column({ type: 'uuid' })
  callToActionId: string;

  @Column({ type: 'json' })
  data: Record<string, any>;

  @Column({ nullable: true })
  submitterIp?: string;
}
