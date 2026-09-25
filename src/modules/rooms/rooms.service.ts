import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import {
  ActorType,
  CatalogItemType,
  RoomModerationAction,
  RoomStatus,
} from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { getPagination } from '../../common/utils';
import {
  CatalogItem,
  HostProfile,
  Room,
  RoomBlacklist,
  RoomModerationEvent,
  RoomStaff,
  User,
} from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../../common/interfaces';
import { RequestMetaDto } from '../../common/decorators';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly rooms: Repository<Room>,
    @InjectRepository(RoomStaff)
    private readonly staff: Repository<RoomStaff>,
    @InjectRepository(RoomBlacklist)
    private readonly blacklists: Repository<RoomBlacklist>,
    @InjectRepository(RoomModerationEvent)
    private readonly events: Repository<RoomModerationEvent>,
    @InjectRepository(CatalogItem)
    private readonly catalog: Repository<CatalogItem>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly usersService: UsersService,
    private readonly audit: AuditService,
  ) {}

  async create(host: HostProfile, title: string) {
    const room = await this.rooms.save(
      this.rooms.create({
        hostProfileId: host.id,
        title,
        status: RoomStatus.OPEN,
      }),
    );
    return this.toPublic(room);
  }

  async listForHost(hostProfileId: string) {
    const rooms = await this.rooms.find({
      where: { hostProfileId },
      relations: ['background'],
      order: { createdAt: 'DESC' },
    });
    return rooms.map((row) => this.toPublic(row));
  }

  async adminList(query: PaginationQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const [items, total] = await this.rooms.findAndCount({
      relations: ['host', 'host.user', 'background'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return new PaginatedResultDto(items.map((row) => this.toPublic(row)), total, page, limit);
  }

  async findById(id: string): Promise<Room> {
    const room = await this.rooms.findOne({
      where: { id },
      relations: ['host', 'host.user', 'background'],
    });
    if (!room) {
      throw new AppException('Room not found', HttpStatus.NOT_FOUND);
    }
    return room;
  }

  async setBackground(roomId: string, host: HostProfile, catalogItemId: string, actor: JwtPayload) {
    const room = await this.assertHostOwns(roomId, host);
    const item = await this.catalog.findOne({ where: { id: catalogItemId } });
    if (!item || !item.isActive || item.type !== CatalogItemType.WALLPAPER) {
      throw new AppException('Background must be an active wallpaper catalog item', HttpStatus.BAD_REQUEST);
    }
    room.backgroundAssetId = item.id;
    await this.rooms.save(room);
    await this.audit.log({
      actorType: ActorType.HOST,
      actorId: actor.sub,
      action: 'room.background',
      targetType: 'room',
      targetId: room.id,
      after: { catalogItemId: item.id },
    });
    return this.toPublic(await this.findById(room.id));
  }

  async addStaff(roomId: string, host: HostProfile, userId: string, actor: JwtPayload) {
    const room = await this.assertHostOwns(roomId, host);
    await this.usersService.findById(userId);
    const existing = await this.staff.findOne({ where: { roomId: room.id, userId } });
    if (existing) {
      return existing;
    }
    const row = await this.staff.save(
      this.staff.create({ roomId: room.id, userId, canMute: true }),
    );
    await this.audit.log({
      actorType: ActorType.HOST,
      actorId: actor.sub,
      action: 'room.staff.add',
      targetType: 'room',
      targetId: room.id,
      after: { userId, canMute: true },
    });
    return row;
  }

  async removeStaff(roomId: string, host: HostProfile, userId: string, actor: JwtPayload) {
    const room = await this.assertHostOwns(roomId, host);
    await this.staff.delete({ roomId: room.id, userId });
    await this.audit.log({
      actorType: ActorType.HOST,
      actorId: actor.sub,
      action: 'room.staff.remove',
      targetType: 'room',
      targetId: room.id,
      after: { userId },
    });
    return { removed: true };
  }

  async kick(roomId: string, host: HostProfile, targetUserId: string, reason: string, actor: JwtPayload) {
    const room = await this.assertHostOwns(roomId, host);
    await this.assertNotOfficial(targetUserId);
    await this.recordModeration(room.id, actor.sub, targetUserId, RoomModerationAction.KICK, reason);
    return { kicked: true };
  }

  async blacklist(
    roomId: string,
    host: HostProfile,
    targetUserId: string,
    reason: string,
    actor: JwtPayload,
  ) {
    const room = await this.assertHostOwns(roomId, host);
    await this.assertNotOfficial(targetUserId);
    const existing = await this.blacklists.findOne({ where: { roomId: room.id, userId: targetUserId } });
    if (!existing) {
      await this.blacklists.save(
        this.blacklists.create({
          roomId: room.id,
          userId: targetUserId,
          createdByUserId: actor.sub,
          reason,
        }),
      );
    }
    await this.recordModeration(
      room.id,
      actor.sub,
      targetUserId,
      RoomModerationAction.BLACKLIST,
      reason,
    );
    return { blacklisted: true };
  }

  async unblacklist(roomId: string, host: HostProfile, targetUserId: string, actor: JwtPayload) {
    const room = await this.assertHostOwns(roomId, host);
    await this.blacklists.delete({ roomId: room.id, userId: targetUserId });
    await this.recordModeration(
      room.id,
      actor.sub,
      targetUserId,
      RoomModerationAction.UNBLACKLIST,
      'removed',
    );
    return { removed: true };
  }

  async mute(
    roomId: string,
    actorUserId: string,
    targetUserId: string,
    asHost: boolean,
    reason?: string,
  ) {
    const room = await this.findById(roomId);
    if (!asHost) {
      const staff = await this.staff.findOne({
        where: { roomId, userId: actorUserId, canMute: true },
      });
      if (!staff) {
        throw new AppException('Room admin mute permission required', HttpStatus.FORBIDDEN);
      }
    } else if (room.host.userId !== actorUserId) {
      throw new AppException('Only the host can mute as host', HttpStatus.FORBIDDEN);
    }
    await this.recordModeration(
      room.id,
      actorUserId,
      targetUserId,
      RoomModerationAction.MUTE,
      reason ?? 'mute',
    );
    return { muted: true };
  }

  async listStaff(roomId: string) {
    return this.staff.find({ where: { roomId }, relations: ['user'] });
  }

  private async assertHostOwns(roomId: string, host: HostProfile): Promise<Room> {
    const room = await this.findById(roomId);
    if (room.hostProfileId !== host.id) {
      throw new AppException('You do not own this room', HttpStatus.FORBIDDEN);
    }
    return room;
  }

  private async assertNotOfficial(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppException('User not found', HttpStatus.NOT_FOUND);
    }
    if (user.isOfficial) {
      throw new AppException('Protected Official cannot be kicked or blacklisted', HttpStatus.FORBIDDEN);
    }
  }

  private async recordModeration(
    roomId: string,
    actorUserId: string,
    targetUserId: string,
    action: RoomModerationAction,
    reason?: string,
  ) {
    const event = await this.events.save(
      this.events.create({
        roomId,
        actorUserId,
        targetUserId,
        action,
        reason,
      }),
    );
    await this.audit.log({
      actorType: ActorType.HOST,
      actorId: actorUserId,
      action: `room.${action}`,
      targetType: 'user',
      targetId: targetUserId,
      reason,
      after: { roomId, moderationEventId: event.id },
    });
    return event;
  }

  toPublic(room: Room) {
    return {
      id: room.id,
      hostProfileId: room.hostProfileId,
      title: room.title,
      status: room.status,
      backgroundAssetId: room.backgroundAssetId ?? null,
      background: room.background
        ? { id: room.background.id, name: room.background.name, assetUrl: room.background.assetUrl }
        : null,
      createdAt: room.createdAt,
    };
  }
}
