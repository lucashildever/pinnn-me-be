import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { MuralEntity } from './mural.entity';
import { MuralThemeConfig } from '../types/mural-theme-config.type';

@Entity('mural_appearances')
export class MuralAppearanceEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => MuralEntity, (mural) => mural.appearance, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  mural: MuralEntity;

  @Column({ type: 'uuid' })
  muralId: string;

  @Column({ nullable: true })
  profileImageUrl: string;

  @Column({ nullable: true })
  coverImageUrl: string;

  @Column({
    type: 'json',
    nullable: true,
  })
  themeConfig: MuralThemeConfig;
}
