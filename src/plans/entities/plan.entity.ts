import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Price } from './price.entity';

@Entity('plans')
export class Plan extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ type: 'json' })
  features: string[];

  @Column({ type: 'json' })
  limits: Record<string, any>;

  @OneToMany(() => Price, (price) => price.plan, { cascade: true })
  prices: Price[];
}
