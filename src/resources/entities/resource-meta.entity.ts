import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('resource_meta')
export class ResourceMetaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  sharedResourceId: string;

  @Column({ type: 'uuid', nullable: true })
  firstResourceId: string;

  @Column({ type: 'varchar', nullable: true })
  groupName: string | null;

  @Column('json', { nullable: true })
  history: { sharedMuralId: string; order: number }[];
}
