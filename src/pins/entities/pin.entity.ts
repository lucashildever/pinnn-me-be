import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { VariantEntity } from './variant.entity';

@Entity('pins')
export class PinEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => VariantEntity, (variant) => variant.pin, {
    cascade: true,
    eager: true,
  })
  variants: VariantEntity[];

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  order: string;
}
