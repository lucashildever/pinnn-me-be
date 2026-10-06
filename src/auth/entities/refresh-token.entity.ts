import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

import { UserEntity } from 'src/users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tokenHash: string; // Hash do token enviado ao usuário

  @Column({ default: false })
  isRevoked: boolean;

  @Column()
  expiresAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.refreshTokens, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;
}
