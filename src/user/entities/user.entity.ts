import { UserPlan } from 'src/common/enums/user-plan.enum';
import { Mural } from 'src/mural/entities/mural.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  username: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ unique: true, nullable: false })
  password: string;

  @Column({
    name: 'user_plan',
    type: 'enum',
    enum: UserPlan,
    default: UserPlan.BASIC,
    nullable: false,
  })
  userPlan: UserPlan;

  @OneToMany(() => Mural, (mural) => mural.user)
  murals: Mural[];
}
