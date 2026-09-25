import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import {
  AccountType,
  ActorType,
  AgencyStatus,
  FreezeType,
  WalletOwnerType,
} from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { comparePassword, getPagination, hashPassword } from '../../common/utils';
import { Agency } from '../../database/entities';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { FreezeService } from '../security/freeze.service';
import { JwtPayload } from '../../common/interfaces';
import { RequestMetaDto } from '../../common/decorators';

export interface CreateAgencyInput {
  email: string;
  username: string;
  password: string;
  displayName: string;
  country: string;
  sharePercent?: number;
}

@Injectable()
export class AgenciesService {
  constructor(
    @InjectRepository(Agency)
    private readonly agencies: Repository<Agency>,
    private readonly wallets: WalletService,
    private readonly audit: AuditService,
    private readonly freeze: FreezeService,
  ) {}

  async create(input: CreateAgencyInput, actor: JwtPayload, meta?: RequestMetaDto) {
    const duplicate = await this.agencies.findOne({
      where: [{ email: input.email.toLowerCase() }, { username: input.username }],
    });
    if (duplicate) {
      throw new AppException('Agency email or username already exists', HttpStatus.CONFLICT);
    }

    const saved = await this.agencies.save(
      this.agencies.create({
        email: input.email.toLowerCase(),
        username: input.username,
        passwordHash: await hashPassword(input.password),
        displayName: input.displayName,
        country: input.country.toUpperCase(),
        sharePercent: input.sharePercent ?? 0,
        status: AgencyStatus.ACTIVE,
      }),
    );
    await this.wallets.getOrCreateWallet(WalletOwnerType.AGENCY, saved.id);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'agency.create',
      targetType: 'agency',
      targetId: saved.id,
      after: this.toPublic(saved),
      meta,
    });
    return this.toPublic(saved);
  }

  async list(query: PaginationQueryDto & { country?: string; status?: AgencyStatus }) {
    const { skip, take, page, limit } = getPagination(query);
    const qb = this.agencies.createQueryBuilder('agency').orderBy('agency.createdAt', 'DESC');
    if (query.country) {
      qb.andWhere('agency.country = :country', { country: query.country.toUpperCase() });
    }
    if (query.status) {
      qb.andWhere('agency.status = :status', { status: query.status });
    }
    const [items, total] = await qb.skip(skip).take(take).getManyAndCount();
    return new PaginatedResultDto(items.map((row) => this.toPublic(row)), total, page, limit);
  }

  async findById(id: string): Promise<Agency> {
    const agency = await this.agencies.findOne({ where: { id } });
    if (!agency) {
      throw new AppException('Agency not found', HttpStatus.NOT_FOUND);
    }
    return agency;
  }

  async findByLogin(login: string): Promise<Agency | null> {
    return this.agencies
      .createQueryBuilder('agency')
      .addSelect('agency.passwordHash')
      .where('LOWER(agency.email) = LOWER(:login) OR agency.username = :login', { login })
      .getOne();
  }

  async update(
    id: string,
    patch: Partial<Pick<Agency, 'displayName' | 'status' | 'sharePercent' | 'country'>>,
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    const agency = await this.findById(id);
    const before = this.toPublic(agency);
    Object.assign(agency, patch);
    if (patch.country) {
      agency.country = patch.country.toUpperCase();
    }
    const saved = await this.agencies.save(agency);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'agency.update',
      targetType: 'agency',
      targetId: id,
      before,
      after: this.toPublic(saved),
      meta,
    });
    return this.toPublic(saved);
  }

  async freezeAgency(id: string, reason: string, actor: JwtPayload, meta?: RequestMetaDto) {
    const agency = await this.findById(id);
    agency.frozen = true;
    agency.status = AgencyStatus.FROZEN;
    await this.agencies.save(agency);
    await this.freeze.freeze({
      ownerType: WalletOwnerType.AGENCY,
      ownerId: id,
      freezeType: FreezeType.ACCOUNT,
      reason,
      actor,
      actorType: ActorType.STAFF,
      meta,
    });
    return this.toPublic(agency);
  }

  async verifyPassword(agency: Agency, password: string): Promise<boolean> {
    return comparePassword(password, agency.passwordHash);
  }

  toPublic(agency: Agency) {
    return {
      id: agency.id,
      email: agency.email,
      username: agency.username,
      displayName: agency.displayName,
      country: agency.country,
      status: agency.status,
      sharePercent: Number(agency.sharePercent),
      frozen: agency.frozen,
      accountType: AccountType.AGENCY,
      createdAt: agency.createdAt,
    };
  }
}
