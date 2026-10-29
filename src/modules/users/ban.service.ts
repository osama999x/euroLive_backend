import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import { ActorType, BanDuration, BanType, RoomStatus, UserStatus } from '../../common/enums';
import {
  HostProfile,
  Room,
  User,
  UserBan,
  UserDevice,
} from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../../common/interfaces';
import { RequestMetaDto } from '../../common/decorators';
import { banExpiresAt, banIsActive } from './ban.util';
import { CreateBanDto } from './dto/ban.dto';
import { UsersService } from './users.service';

@Injectable()
export class BanService {
  constructor(
    @InjectRepository(UserBan)
    private readonly bans: Repository<UserBan>,
    @InjectRepository(UserDevice)
    private readonly devices: Repository<UserDevice>,
    @InjectRepository(HostProfile)
    private readonly hosts: Repository<HostProfile>,
    @InjectRepository(Room)
    private readonly rooms: Repository<Room>,
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateBanDto, actor: JwtPayload, meta?: RequestMetaDto) {
    const user = await this.users.findById(userId);
    if (dto.type === BanType.DEVICE && !dto.deviceId) {
      throw new AppException('deviceId is required for a device ban', HttpStatus.BAD_REQUEST);
    }

    const expiresAt = banExpiresAt(dto.duration, dto.customHours);
    const startsAt = new Date();
    const created: UserBan[] = [];

    if (dto.type === BanType.ID || dto.type === BanType.LIVE) {
      created.push(
        await this.bans.save(
          this.bans.create({
            userId: user.id,
            type: dto.type,
            reason: dto.reason,
            startsAt,
            expiresAt,
            createdById: actor.sub,
          }),
        ),
      );
    }

    if (dto.type === BanType.DEVICE) {
      created.push(
        await this.bans.save(
          this.bans.create({
            userId: user.id,
            deviceId: dto.deviceId,
            type: BanType.DEVICE,
            reason: dto.reason,
            startsAt,
            expiresAt,
            createdById: actor.sub,
          }),
        ),
      );
    }

    if (dto.type === BanType.ID) {
      user.status = UserStatus.BANNED;
      await this.users.save(user);
      if (dto.includeDevices) {
        const devices = await this.devices.find({ where: { userId: user.id } });
        for (const device of devices) {
          created.push(
            await this.bans.save(
              this.bans.create({
                userId: user.id,
                deviceId: device.deviceId,
                type: BanType.DEVICE,
                reason: dto.reason ?? 'Included with ID ban',
                startsAt,
                expiresAt,
                createdById: actor.sub,
              }),
            ),
          );
        }
      }
    }

    if (dto.type === BanType.LIVE) {
      const host = await this.hosts.findOne({ where: { userId: user.id } });
      if (host) {
        await this.rooms.update({ hostProfileId: host.id }, { status: RoomStatus.CLOSED });
      }
    }

    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: `user.ban.${dto.type}`,
      targetType: 'user',
      targetId: user.id,
      reason: dto.reason,
      after: {
        duration: dto.duration,
        expiresAt: expiresAt?.toISOString() ?? null,
        includeDevices: Boolean(dto.includeDevices),
        deviceId: dto.deviceId,
        banIds: created.map((row) => row.id),
      },
      meta,
    });

    return {
      bans: created,
      user: await this.decorate(user),
    };
  }

  async list(userId: string) {
    await this.users.findById(userId);
    await this.expireStaleForUser(userId);
    return this.bans.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async listDevices(userId: string) {
    await this.users.findById(userId);
    const devices = await this.devices.find({
      where: { userId },
      order: { lastSeenAt: 'DESC' },
    });
    const activeDeviceBans = await this.activeDeviceBanMap(devices.map((row) => row.deviceId));
    return devices.map((device) => ({
      id: device.id,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      lastSeenAt: device.lastSeenAt,
      isNew: device.isNew,
      banned: Boolean(activeDeviceBans.get(device.deviceId)),
      bannedUntil: activeDeviceBans.get(device.deviceId)?.expiresAt ?? null,
    }));
  }

  async revoke(userId: string, banId: string, actor: JwtPayload, meta?: RequestMetaDto) {
    const row = await this.bans.findOne({ where: { id: banId, userId } });
    if (!row) {
      throw new AppException('Ban not found', HttpStatus.NOT_FOUND);
    }
    row.revokedAt = new Date();
    await this.bans.save(row);
    if (row.type === BanType.ID) {
      await this.syncIdStatus(userId);
    }
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'user.ban.revoke',
      targetType: 'user_ban',
      targetId: banId,
      meta,
    });
    return row;
  }

  async banLive(userId: string, actor: JwtPayload, meta?: RequestMetaDto) {
    const current = await this.liveState(userId);
    const user = await this.users.findById(userId);
    if (current.liveBanned) {
      return { ...(await this.decorate(user)), alreadyBanned: true };
    }
    const created = await this.create(
      userId,
      { type: BanType.LIVE, duration: BanDuration.PERMANENT, reason: 'Live ban' },
      actor,
      meta,
    );
    return { ...created.user, alreadyBanned: false };
  }

  async unbanLive(userId: string, actor: JwtPayload, meta?: RequestMetaDto) {
    await this.expireStaleForUser(userId);
    const active = await this.activeForUser(userId, BanType.LIVE);
    for (const row of active) {
      row.revokedAt = new Date();
      await this.bans.save(row);
    }
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'user.unban.live',
      targetType: 'user',
      targetId: userId,
      after: { lifted: active.length },
      meta,
    });
    const user = await this.users.findById(userId);
    return { ...(await this.decorate(user)), alreadyClear: active.length === 0 };
  }

  async liveState(userId: string) {
    await this.expireStaleForUser(userId);
    const liveBan = (await this.activeForUser(userId, BanType.LIVE))[0];
    return {
      liveBanned: Boolean(liveBan),
      liveBannedUntil: liveBan?.expiresAt ?? null,
    };
  }

  async unbanId(userId: string, actor: JwtPayload, meta?: RequestMetaDto) {
    const active = await this.activeForUser(userId, BanType.ID);
    for (const row of active) {
      row.revokedAt = new Date();
      await this.bans.save(row);
    }
    const user = await this.users.findById(userId);
    user.status = UserStatus.ACTIVE;
    await this.users.save(user);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'user.unban',
      targetType: 'user',
      targetId: userId,
      meta,
    });
    return this.decorate(user);
  }

  async assertCanLogin(user: User, deviceId?: string): Promise<void> {
    await this.expireStaleForUser(user.id);
    const idBan = (await this.activeForUser(user.id, BanType.ID))[0];
    if (idBan || user.status === UserStatus.BANNED) {
      throw new AppException(
        idBan?.expiresAt
          ? `User is banned until ${idBan.expiresAt.toISOString()}`
          : 'User is banned',
        HttpStatus.FORBIDDEN,
      );
    }
    if (deviceId) {
      const deviceBan = await this.activeDeviceBan(deviceId);
      if (deviceBan) {
        throw new AppException(
          deviceBan.expiresAt
            ? `This device is banned until ${deviceBan.expiresAt.toISOString()}`
            : 'This device is banned',
          HttpStatus.FORBIDDEN,
        );
      }
    }
  }

  async assertCanGoLive(userId: string): Promise<void> {
    await this.expireStaleForUser(userId);
    const liveBan = (await this.activeForUser(userId, BanType.LIVE))[0];
    if (liveBan) {
      throw new AppException(
        liveBan.expiresAt
          ? `Live streaming is banned until ${liveBan.expiresAt.toISOString()}`
          : 'Live streaming is banned',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async decorate(user: User) {
    await this.expireStaleForUser(user.id);
    const idBan = (await this.activeForUser(user.id, BanType.ID))[0];
    const liveBan = (await this.activeForUser(user.id, BanType.LIVE))[0];
    return {
      ...this.users.toPublic(user, true),
      status: idBan ? UserStatus.BANNED : user.status,
      idBanned: Boolean(idBan),
      idBannedUntil: idBan?.expiresAt ?? null,
      liveBanned: Boolean(liveBan),
      liveBannedUntil: liveBan?.expiresAt ?? null,
    };
  }

  private async expireStaleForUser(userId: string) {
    const rows = await this.bans.find({
      where: { userId, revokedAt: IsNull() },
    });
    let idExpired = false;
    for (const row of rows) {
      if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
        row.revokedAt = new Date();
        await this.bans.save(row);
        if (row.type === BanType.ID) {
          idExpired = true;
        }
      }
    }
    if (idExpired) {
      await this.syncIdStatus(userId);
    }
  }

  private async syncIdStatus(userId: string) {
    const still = await this.activeForUser(userId, BanType.ID);
    const user = await this.users.findById(userId);
    user.status = still.length ? UserStatus.BANNED : UserStatus.ACTIVE;
    await this.users.save(user);
  }

  private async activeForUser(userId: string, type: BanType): Promise<UserBan[]> {
    const rows = await this.bans.find({
      where: { userId, type, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return rows.filter((row) => banIsActive(row));
  }

  private async activeDeviceBan(deviceId: string): Promise<UserBan | null> {
    const rows = await this.bans.find({
      where: { deviceId, type: BanType.DEVICE, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return rows.find((row) => banIsActive(row)) ?? null;
  }

  private async activeDeviceBanMap(deviceIds: string[]) {
    const map = new Map<string, UserBan>();
    for (const deviceId of deviceIds) {
      const row = await this.activeDeviceBan(deviceId);
      if (row) {
        map.set(deviceId, row);
      }
    }
    return map;
  }
}
