import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Room } from './room.entity';
import { User } from './user.entity';

@Entity('room_blacklists')
@Index(['roomId', 'userId'], { unique: true })
export class RoomBlacklist extends BaseEntity {
  @Column({ type: 'uuid' })
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @Column({ type: 'varchar', nullable: true })
  reason?: string;
}
