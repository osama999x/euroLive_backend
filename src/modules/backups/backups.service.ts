import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import { ActorType, BackupRunStatus, StaffRole } from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { comparePassword, getPagination } from '../../common/utils';
import { BackupRun, BackupSettings, StaffUser } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../../common/interfaces';
import { RequestMetaDto } from '../../common/decorators';
import { verifyTotp } from '../../common/utils';

@Injectable()
export class BackupsService {
  constructor(
    @InjectRepository(BackupSettings)
    private readonly settings: Repository<BackupSettings>,
    @InjectRepository(BackupRun)
    private readonly runs: Repository<BackupRun>,
    @InjectRepository(StaffUser)
    private readonly staff: Repository<StaffUser>,
    private readonly audit: AuditService,
  ) {}

  async getSettings() {
    return this.ensureSettings();
  }

  async updateSettings(
    input: { enabled?: boolean; intervalHours?: number; password?: string; totp?: string; reason?: string },
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    this.assertMaster(actor);
    const row = await this.ensureSettings();
    if (input.enabled === false && row.enabled) {
      await this.verifyMasterSecret(actor.sub, input.password, input.totp);
      if (!input.reason) {
        throw new AppException('Disabling backups requires a risk reason', HttpStatus.BAD_REQUEST);
      }
      row.disabledReason = input.reason;
    }
    if (input.enabled === true) {
      row.disabledReason = undefined;
    }
    if (input.enabled != null) {
      row.enabled = input.enabled;
    }
    if (input.intervalHours) {
      row.intervalHours = input.intervalHours;
    }
    const saved = await this.settings.save(row);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'backup.settings',
      targetType: 'backup_settings',
      targetId: saved.id,
      reason: input.reason,
      after: { enabled: saved.enabled, intervalHours: saved.intervalHours },
      meta,
    });
    return saved;
  }

  async run(actor: JwtPayload | undefined, manual: boolean, meta?: RequestMetaDto) {
    const settings = await this.ensureSettings();
    if (!manual && !settings.enabled) {
      throw new AppException('Scheduled backups are disabled', HttpStatus.BAD_REQUEST);
    }

    const run = await this.runs.save(
      this.runs.create({
        status: BackupRunStatus.RUNNING,
        manual,
        triggeredById: actor?.sub,
      }),
    );

    try {
      const tables = await this.settings.manager.query<{ relname: string }[]>(
        `SELECT relname FROM pg_class WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace ORDER BY relname`,
      );
      const snapshot: Record<string, number> = {};
      for (const table of tables) {
        const count = await this.settings.manager.query<{ count: string }[]>(
          `SELECT COUNT(*)::text AS count FROM "${table.relname}"`,
        );
        snapshot[table.relname] = Number(count[0]?.count ?? 0);
      }

      const dir = join(process.cwd(), 'storage', 'backups');
      await mkdir(dir, { recursive: true });
      const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const path = join(dir, filename);
      await writeFile(
        path,
        JSON.stringify({ at: new Date().toISOString(), snapshot }, null, 2),
        'utf8',
      );

      run.status = BackupRunStatus.COMPLETED;
      run.path = path;
      run.snapshot = snapshot;
      settings.lastRunAt = new Date();
      await this.settings.save(settings);
    } catch (error) {
      run.status = BackupRunStatus.FAILED;
      run.error = error instanceof Error ? error.message : String(error);
    }

    const saved = await this.runs.save(run);
    if (actor) {
      await this.audit.log({
        actorType: ActorType.STAFF,
        actorId: actor.sub,
        action: 'backup.run',
        targetType: 'backup_run',
        targetId: saved.id,
        after: { status: saved.status, path: saved.path },
        meta,
      });
    }
    return saved;
  }

  async list(query: PaginationQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const [items, total] = await this.runs.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return new PaginatedResultDto(items, total, page, limit);
  }

  private async ensureSettings(): Promise<BackupSettings> {
    const existing = await this.settings.find({ order: { createdAt: 'ASC' }, take: 1 });
    if (existing[0]) {
      return existing[0];
    }
    return this.settings.save(
      this.settings.create({ enabled: true, intervalHours: 24 }),
    );
  }

  private async verifyMasterSecret(staffId: string, password?: string, totp?: string) {
    if (!password) {
      throw new AppException('Master password is required to disable backups', HttpStatus.FORBIDDEN);
    }
    const staff = await this.staff
      .createQueryBuilder('staff')
      .addSelect(['staff.passwordHash', 'staff.totpSecret'])
      .where('staff.id = :id', { id: staffId })
      .getOne();
    if (!staff || !(await comparePassword(password, staff.passwordHash))) {
      throw new AppException('Invalid Master password', HttpStatus.FORBIDDEN);
    }
    if (staff.totpEnabled) {
      if (!totp || !staff.totpSecret || !verifyTotp(totp, staff.totpSecret)) {
        throw new AppException('Valid 2FA code is required', HttpStatus.FORBIDDEN);
      }
    }
  }

  private assertMaster(actor: JwtPayload) {
    if (actor.role !== StaffRole.SUPER_ADMIN && !actor.roles?.includes(StaffRole.SUPER_ADMIN)) {
      throw new AppException('Master Admin only', HttpStatus.FORBIDDEN);
    }
  }
}
