import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { RoomModerationAction } from '../../common/enums';
import { ImmutableEntity } from './immutable.entity';
import { Room } from './room.entity';

@Entity('room_moderation_events')
export class RoomModerationEvent extends ImmutableEntity {
  @Column({ type: 'uuid' })
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'varchar' })
  action: RoomModerationAction;

  @Column({ type: 'uuid' })
  actorUserId: string;

  @Column({ type: 'uuid' })
  targetUserId: string;

  @Column({ type: 'varchar', nullable: true })
  reason?: string;
}
