import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResourceEntity } from './resource.entity';

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

  @Column('json', { nullable: false })
  history: { sourceMuralId: string; order: number }[] = [];

  @OneToOne(() => ResourceEntity, (resource) => resource.resourceMeta, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource: ResourceEntity;
}
