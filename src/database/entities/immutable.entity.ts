import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

/** Insert-only rows. No updatedAt / deletedAt — never expose PATCH/DELETE. */
export abstract class ImmutableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
