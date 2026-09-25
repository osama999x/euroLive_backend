import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import { ActorType, SosStatus, StaffRole } from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { formatCaseNumber, getPagination } from '../../common/utils';
import { HostProfile, SosAlert } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { HostsService } from '../hosts/hosts.service';
import { JwtPayload } from '../../common/interfaces';
import { RequestMetaDto } from '../../common/decorators';

@Injectable()
export class SosService {
  constructor(
    @InjectRepository(SosAlert)
    private readonly alerts: Repository<SosAlert>,
    private readonly hosts: HostsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    host: HostProfile,
    input: { roomId?: string; message?: string; assignedResellerId?: string },
  ) {
    const seq = (await this.alerts.count()) + 1;
    const caseNumber = formatCaseNumber('SOS', seq);
    const escalateAfterMinutes = 5;
    const now = new Date();
    const row = await this.alerts.save(
      this.alerts.create({
        caseNumber,
        hostUserId: host.userId,
        roomId: input.roomId,
        message: input.message,
        assignedResellerId: input.assignedResellerId,
        status: SosStatus.OPEN,
        escalateAfterMinutes,
        escalateAt: new Date(now.getTime() + escalateAfterMinutes * 60_000),
        trail: [
          {
            at: now.toISOString(),
            actorType: ActorType.HOST,
            actorId: host.userId,
            action: 'opened',
            note: input.message,
          },
        ],
      }),
    );

    await this.hosts.lockProtection(
      host.id,
      'SOS Host Protection Lock',
      caseNumber,
      new Date(Date.now() + 24 * 3600_000),
    );

    await this.audit.log({
      actorType: ActorType.HOST,
      actorId: host.userId,
      action: 'sos.create',
      targetType: 'sos',
      targetId: row.id,
      caseNumber,
      after: { roomId: input.roomId },
    });

    return row;
  }

  async list(query: PaginationQueryDto & { status?: SosStatus }) {
    await this.escalateOverdue();
    const { skip, take, page, limit } = getPagination(query);
    const qb = this.alerts.createQueryBuilder('row').orderBy('row.createdAt', 'DESC');
    if (query.status) {
      qb.andWhere('row.status = :status', { status: query.status });
    }
    const [items, total] = await qb.skip(skip).take(take).getManyAndCount();
    return new PaginatedResultDto(items, total, page, limit);
  }

  async listForHost(userId: string) {
    await this.escalateOverdue();
    return this.alerts.find({ where: { hostUserId: userId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<SosAlert> {
    const row = await this.alerts.findOne({ where: { id } });
    if (!row) {
      throw new AppException('SOS alert not found', HttpStatus.NOT_FOUND);
    }
    return row;
  }

  async ack(id: string, actor: JwtPayload, actorType: string, meta?: RequestMetaDto) {
    await this.escalateOverdue();
    const row = await this.findById(id);
    if (row.status === SosStatus.RESOLVED) {
      throw new AppException('SOS already resolved', HttpStatus.BAD_REQUEST);
    }
    if (actorType === ActorType.RESELLER) {
      if (row.assignedResellerId && row.assignedResellerId !== actor.sub) {
        throw new AppException('This SOS is not assigned to you', HttpStatus.FORBIDDEN);
      }
    }
    row.status = SosStatus.HANDLING;
    row.acknowledgedAt = new Date();
    row.acknowledgedById = actor.sub;
    row.acknowledgedByType = actorType;
    row.trail = [
      ...row.trail,
      {
        at: new Date().toISOString(),
        actorType,
        actorId: actor.sub,
        action: 'ack',
      },
    ];
    const saved = await this.alerts.save(row);
    await this.audit.log({
      actorType: actorType as ActorType,
      actorId: actor.sub,
      action: 'sos.ack',
      targetType: 'sos',
      targetId: id,
      caseNumber: row.caseNumber,
      meta,
    });
    return saved;
  }

  async resolve(id: string, outcome: string, actor: JwtPayload, meta?: RequestMetaDto) {
    const row = await this.findById(id);
    row.status = SosStatus.RESOLVED;
    row.resolvedAt = new Date();
    row.outcome = outcome;
    row.trail = [
      ...row.trail,
      {
        at: new Date().toISOString(),
        actorType: ActorType.STAFF,
        actorId: actor.sub,
        action: 'resolved',
        note: outcome,
      },
    ];
    const saved = await this.alerts.save(row);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'sos.resolve',
      targetType: 'sos',
      targetId: id,
      caseNumber: row.caseNumber,
      reason: outcome,
      meta,
    });
    return saved;
  }

  async escalateOverdue() {
    const due = await this.alerts.find({
      where: { status: In([SosStatus.OPEN, SosStatus.ACKNOWLEDGED]) },
    });
    const now = new Date();
    for (const row of due) {
      if (row.escalateAt.getTime() > now.getTime()) {
        continue;
      }
      if (row.status === SosStatus.ESCALATED) {
        continue;
      }
      row.status = SosStatus.ESCALATED;
      row.trail = [
        ...row.trail,
        {
          at: now.toISOString(),
          actorType: ActorType.SYSTEM,
          actorId: row.id,
          action: 'escalated',
          note: 'No ack before escalateAt',
        },
      ];
      await this.alerts.save(row);
      await this.audit.log({
        actorType: ActorType.SYSTEM,
        actorId: row.id,
        action: 'sos.escalate',
        targetType: 'sos',
        targetId: row.id,
        caseNumber: row.caseNumber,
      });
    }
  }

  isMaster(actor: JwtPayload): boolean {
    return actor.role === StaffRole.SUPER_ADMIN || Boolean(actor.roles?.includes(StaffRole.SUPER_ADMIN));
  }
}
