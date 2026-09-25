import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import {
  ActorType,
  ComplaintSeverity,
  ComplaintStatus,
  ComplaintType,
  EvidenceType,
  StaffRole,
} from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { formatCaseNumber, getPagination } from '../../common/utils';
import { Complaint, ComplaintEvent, ComplaintEvidence, HostProfile } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { HostsService } from '../hosts/hosts.service';
import { JwtPayload } from '../../common/interfaces';
import { RequestMetaDto } from '../../common/decorators';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint)
    private readonly complaints: Repository<Complaint>,
    @InjectRepository(ComplaintEvidence)
    private readonly evidence: Repository<ComplaintEvidence>,
    @InjectRepository(ComplaintEvent)
    private readonly events: Repository<ComplaintEvent>,
    private readonly hosts: HostsService,
    private readonly audit: AuditService,
  ) {}

  async create(input: {
    type: ComplaintType;
    reporterId: string;
    reporterType: string;
    targetId: string;
    targetType: string;
    summary: string;
    severity?: ComplaintSeverity;
    evidence?: Array<{ type: EvidenceType; url: string }>;
    protectionLock?: boolean;
  }) {
    const seq = (await this.complaints.count()) + 1;
    const caseNumber = formatCaseNumber('CMP', seq);
    const row = await this.complaints.save(
      this.complaints.create({
        caseNumber,
        type: input.type,
        status: ComplaintStatus.RECEIVED,
        severity: input.severity ?? ComplaintSeverity.MEDIUM,
        reporterId: input.reporterId,
        reporterType: input.reporterType,
        targetId: input.targetId,
        targetType: input.targetType,
        summary: input.summary,
        protectionLock: input.protectionLock ?? false,
      }),
    );

    if (input.evidence?.length) {
      await this.evidence.save(
        input.evidence.map((item) =>
          this.evidence.create({
            complaintId: row.id,
            type: item.type,
            url: item.url,
          }),
        ),
      );
    }

    await this.addEvent(row.id, 'received', input.reporterId, input.reporterType, input.summary);
    await this.audit.log({
      actorType: input.reporterType as ActorType,
      actorId: input.reporterId,
      action: 'complaint.create',
      targetType: input.targetType,
      targetId: input.targetId,
      caseNumber,
      after: { complaintId: row.id, type: input.type },
    });

    if (input.protectionLock && input.targetType === 'host') {
      await this.hosts.lockProtection(
        input.targetId,
        'Serious complaint protection lock',
        caseNumber,
        new Date(Date.now() + 7 * 86400000),
      );
    }

    return this.getById(row.id, false);
  }

  async list(query: PaginationQueryDto & { status?: ComplaintStatus; type?: ComplaintType }) {
    const { skip, take, page, limit } = getPagination(query);
    const qb = this.complaints.createQueryBuilder('row').orderBy('row.createdAt', 'DESC');
    if (query.status) {
      qb.andWhere('row.status = :status', { status: query.status });
    }
    if (query.type) {
      qb.andWhere('row.type = :type', { type: query.type });
    }
    const [items, total] = await qb.skip(skip).take(take).getManyAndCount();
    return new PaginatedResultDto(items, total, page, limit);
  }

  async getById(id: string, includeEvidence: boolean) {
    const row = await this.complaints.findOne({ where: { id } });
    if (!row) {
      throw new AppException('Complaint not found', HttpStatus.NOT_FOUND);
    }
    const events = await this.events.find({
      where: { complaintId: id },
      order: { createdAt: 'ASC' },
    });
    const evidence = includeEvidence
      ? await this.evidence.find({ where: { complaintId: id } })
      : [];
    return { ...row, events, evidence: includeEvidence ? evidence : undefined };
  }

  async review(
    id: string,
    input: {
      action: 'confirm' | 'reject' | 'close';
      note?: string;
      penalty?: string;
      salaryDeduct?: boolean;
    },
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    const row = await this.complaints.findOne({ where: { id } });
    if (!row) {
      throw new AppException('Complaint not found', HttpStatus.NOT_FOUND);
    }

    if (input.action === 'confirm') {
      row.status = ComplaintStatus.ACTION_TAKEN;
      row.salaryDeductFlag = Boolean(input.salaryDeduct);
    } else if (input.action === 'reject') {
      row.status = ComplaintStatus.REJECTED;
    } else {
      row.status = ComplaintStatus.CLOSED;
    }
    row.reviewedById = actor.sub;
    row.reviewedAt = new Date();
    await this.complaints.save(row);

    await this.addEvent(
      row.id,
      input.action,
      actor.sub,
      ActorType.STAFF,
      input.note ?? input.penalty,
    );
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: `complaint.${input.action}`,
      targetType: 'complaint',
      targetId: row.id,
      caseNumber: row.caseNumber,
      reason: input.note,
      after: { status: row.status, salaryDeductFlag: row.salaryDeductFlag, penalty: input.penalty },
      meta,
    });

    return this.getById(row.id, this.isMaster(actor));
  }

  async listForHost(host: HostProfile) {
    return this.complaints.find({
      where: { reporterId: host.userId },
      order: { createdAt: 'DESC' },
    });
  }

  isMaster(actor: JwtPayload): boolean {
    return actor.role === StaffRole.SUPER_ADMIN || Boolean(actor.roles?.includes(StaffRole.SUPER_ADMIN));
  }

  private async addEvent(
    complaintId: string,
    action: string,
    actorId: string,
    actorType: string,
    note?: string,
  ) {
    await this.events.save(
      this.events.create({ complaintId, action, actorId, actorType, note }),
    );
  }
}
