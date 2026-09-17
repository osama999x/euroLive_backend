import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActorType } from '../../common/enums';
import { getPagination } from '../../common/utils';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { AdminActionLog } from '../../database/entities';
import { RequestMetaDto } from '../../common/decorators';

export interface AuditLogInput {
  actorType: ActorType;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  meta?: RequestMetaDto;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AdminActionLog)
    private readonly logs: Repository<AdminActionLog>,
  ) {}

  async log(input: AuditLogInput): Promise<AdminActionLog> {
    const row = this.logs.create({
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      before: input.before,
      after: input.after,
      ip: input.meta?.ip,
      userAgent: input.meta?.userAgent,
    });
    return this.logs.save(row);
  }

  async list(
    query: PaginationQueryDto & { action?: string; actorId?: string },
  ): Promise<PaginatedResultDto<AdminActionLog>> {
    const { skip, take, page, limit } = getPagination(query);
    const qb = this.logs.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');

    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }
    if (query.actorId) {
      qb.andWhere('log.actorId = :actorId', { actorId: query.actorId });
    }

    const [items, total] = await qb.skip(skip).take(take).getManyAndCount();
    return new PaginatedResultDto(items, total, page, limit);
  }
}
