import {
  Entity,
  Column,
  OneToMany,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from 'src/common/entities/timestamp.entity';
import { MuralEntity } from 'src/murals/entities/mural.entity';
import { Status } from 'src/common/enums/status.enum';
import { Role } from '../../auth/enums/role.enum';

@Entity('users')
export class UserEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => MuralEntity, (muralEntity) => muralEntity.user)
  murals: MuralEntity[];

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  username: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 80,
    nullable: false,
  })
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.Active,
  })
  status: Status;

  @UpdateDateColumn({ type: 'timestamp' })
  deletedAt: Date;

  @Column({
    type: 'varchar',
    length: 64,
    unique: true,
    nullable: true,
  })
  stripeCustomerId?: string;
}
