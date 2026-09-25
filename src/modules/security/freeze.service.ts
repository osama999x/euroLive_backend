import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import {
  ActorType,
  FreezeStatus,
  FreezeType,
  WalletOwnerType,
} from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { getPagination } from '../../common/utils';
import { AccountFreeze } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../../common/interfaces';
import { RequestMetaDto } from '../../common/decorators';

@Injectable()
export class FreezeService {
  constructor(
    @InjectRepository(AccountFreeze)
    private readonly freezes: Repository<AccountFreeze>,
    private readonly audit: AuditService,
  ) {}

  async isFrozen(ownerType: string, ownerId: string): Promise<boolean> {
    const row = await this.freezes.findOne({
      where: {
        ownerType,
        ownerId,
        status: In([FreezeStatus.FROZEN, FreezeStatus.PENDING_REVIEW]),
      },
    });
    return Boolean(row);
  }

  async assertNotFrozen(ownerType: string, ownerId: string): Promise<void> {
    if (await this.isFrozen(ownerType, ownerId)) {
      throw new AppException(
        'Account or wallet is frozen pending Master review',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async freeze(input: {
    ownerType: string;
    ownerId: string;
    freezeType: FreezeType;
    reason: string;
    actor?: JwtPayload;
    actorType?: ActorType;
    status?: FreezeStatus;
    meta?: RequestMetaDto;
  }): Promise<AccountFreeze> {
    const row = await this.freezes.save(
      this.freezes.create({
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        freezeType: input.freezeType,
        reason: input.reason,
        status: input.status ?? FreezeStatus.PENDING_REVIEW,
        createdById: input.actor?.sub,
        createdByType: input.actorType ?? input.actor?.accountType,
      }),
    );

    await this.audit.log({
      actorType: input.actorType ?? ActorType.SYSTEM,
      actorId: input.actor?.sub ?? input.ownerId,
      action: 'account.freeze',
      targetType: input.ownerType,
      targetId: input.ownerId,
      reason: input.reason,
      after: { freezeId: row.id, freezeType: row.freezeType, status: row.status },
      meta: input.meta,
    });

    return row;
  }

  async list(
    query: PaginationQueryDto & { status?: FreezeStatus; ownerId?: string },
  ): Promise<PaginatedResultDto<AccountFreeze>> {
    const { skip, take, page, limit } = getPagination(query);
    const qb = this.freezes.createQueryBuilder('row').orderBy('row.createdAt', 'DESC');
    if (query.status) {
      qb.andWhere('row.status = :status', { status: query.status });
    }
    if (query.ownerId) {
      qb.andWhere('row.ownerId = :ownerId', { ownerId: query.ownerId });
    }
    const [items, total] = await qb.skip(skip).take(take).getManyAndCount();
    return new PaginatedResultDto(items, total, page, limit);
  }

  async review(
    id: string,
    action: 'restore' | 'confirm' | 'ban',
    actor: JwtPayload,
    note?: string,
    meta?: RequestMetaDto,
  ): Promise<AccountFreeze> {
    const row = await this.freezes.findOne({ where: { id } });
    if (!row) {
      throw new AppException('Freeze not found', HttpStatus.NOT_FOUND);
    }

    const statusMap = {
      restore: FreezeStatus.RESTORED,
      confirm: FreezeStatus.CONFIRMED,
      ban: FreezeStatus.CONFIRMED,
    };
    row.status = statusMap[action];
    row.reviewedById = actor.sub;
    row.reviewedAt = new Date();
    row.reviewNote = note;
    const saved = await this.freezes.save(row);

    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: `account.freeze.${action}`,
      targetType: row.ownerType,
      targetId: row.ownerId,
      reason: note ?? row.reason,
      after: { freezeId: saved.id, status: saved.status },
      meta,
    });

    return saved;
  }

  walletOwnerType(ownerType: WalletOwnerType | string): string {
    return ownerType;
  }
}
