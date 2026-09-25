import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User, UserDevice, UserSession } from '../../database/entities';
import { MailService } from '../../infrastructure/mail/mail.service';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(UserDevice)
    private readonly devices: Repository<UserDevice>,
    @InjectRepository(UserSession)
    private readonly sessions: Repository<UserSession>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly mail: MailService,
  ) {}

  async recordLogin(userId: string, deviceId?: string, deviceName?: string) {
    const now = new Date();
    if (deviceId) {
      let device = await this.devices.findOne({ where: { userId, deviceId } });
      const isNew = !device;
      if (!device) {
        device = this.devices.create({
          userId,
          deviceId,
          deviceName,
          lastSeenAt: now,
          isNew: true,
        });
      } else {
        device.lastSeenAt = now;
        device.deviceName = deviceName ?? device.deviceName;
        device.isNew = false;
      }
      await this.devices.save(device);

      const user = await this.users.findOne({ where: { id: userId } });
      const ids = new Set(user?.deviceIds ?? []);
      ids.add(deviceId);
      if (user) {
        user.deviceIds = [...ids];
        await this.users.save(user);
      }

      if (isNew && user?.email) {
        try {
          await this.mail.send({
            to: user.email,
            subject: 'King Live — new device sign-in',
            text: `A new device (${deviceName || deviceId}) signed in to your King Live account. If this was not you, freeze the account from the app.`,
          });
        } catch (error) {
          this.logger.warn(
            `New-device email skipped: ${error instanceof Error ? error.message : error}`,
          );
        }
      }
    }

    const session = await this.sessions.save(
      this.sessions.create({
        userId,
        deviceId,
        lastSeenAt: now,
      }),
    );
    return session;
  }

  async list(userId: string) {
    return this.devices.find({ where: { userId }, order: { lastSeenAt: 'DESC' } });
  }

  async logoutAll(userId: string) {
    await this.sessions.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return { revoked: true };
  }
}
