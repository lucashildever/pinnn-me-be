import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IconConfigDto } from '../dto/icon-config.dto';

@Entity('display_elements')
export class DisplayElementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 15,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    nullable: false,
  })
  content: string;

  @Column({
    type: 'json',
    nullable: false,
  })
  iconConfig: IconConfigDto;
}
