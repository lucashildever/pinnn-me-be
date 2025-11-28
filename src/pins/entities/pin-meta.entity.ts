import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pin_meta')
export class PinMetaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  sharedPinId: string;

  @Column({ type: 'uuid', nullable: true })
  firstPinId: string;

  @Column('json', { nullable: true })
  history: { sharedMuralId: string; order: number }[];
}
