import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class TimestampEntity {
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
