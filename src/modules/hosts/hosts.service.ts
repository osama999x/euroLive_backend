import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import {
  ActorType,
  FreezeType,
  HostStatus,
  StaffRole,
  UserStatus,
  WalletOwnerType,
} from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { comparePassword, getPagination, hashPassword } from '../../common/utils';
import { HostProfile, User } from '../../database/entities';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditService } from '../audit/audit.service';
import { FreezeService } from '../security/freeze.service';
import { JwtPayload } from '../../common/interfaces';
import { RequestMetaDto } from '../../common/decorators';

@Injectable()
export class HostsService {
  constructor(
    @InjectRepository(HostProfile)
    private readonly hosts: Repository<HostProfile>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly usersService: UsersService,
    private readonly wallets: WalletService,
    private readonly audit: AuditService,
    private readonly freeze: FreezeService,
  ) {}

  async create(
    input: {
      userId?: string;
      username?: string;
      displayName?: string;
      email?: string;
      password?: string;
      country: string;
      agencyId?: string;
    },
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    let user: User;
    if (input.userId) {
      user = await this.usersService.findById(input.userId);
    } else {
      if (!input.username || !input.displayName) {
        throw new AppException('username and displayName are required', HttpStatus.BAD_REQUEST);
      }
      user = await this.usersService.create({
        username: input.username,
        displayName: input.displayName,
        email: input.email,
        country: input.country,
        password: input.password,
      });
    }

    const existing = await this.hosts.findOne({ where: { userId: user.id } });
    if (existing) {
      throw new AppException('User is already a host', HttpStatus.CONFLICT);
    }

    const profile = await this.hosts.save(
      this.hosts.create({
        userId: user.id,
        agencyId: input.agencyId,
        country: input.country.toUpperCase(),
        status: HostStatus.ACTIVE,
      }),
    );
    await this.wallets.getOrCreateWallet(WalletOwnerType.HOST_SALARY, profile.id);

    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'host.create',
      targetType: 'host',
      targetId: profile.id,
      after: { userId: user.id, country: profile.country, agencyId: profile.agencyId },
      meta,
    });

    return this.toPublic(await this.findById(profile.id));
  }

  async findById(id: string): Promise<HostProfile> {
    const profile = await this.hosts.findOne({
      where: { id },
      relations: ['user', 'agency'],
    });
    if (!profile) {
      throw new AppException('Host not found', HttpStatus.NOT_FOUND);
    }
    return profile;
  }

  async findByUserId(userId: string): Promise<HostProfile> {
    const profile = await this.hosts.findOne({
      where: { userId },
      relations: ['user', 'agency'],
    });
    if (!profile) {
      throw new AppException('Host profile not found', HttpStatus.NOT_FOUND);
    }
    return profile;
  }

  async list(query: PaginationQueryDto & { agencyId?: string; country?: string }) {
    const { skip, take, page, limit } = getPagination(query);
    const qb = this.hosts
      .createQueryBuilder('host')
      .leftJoinAndSelect('host.user', 'user')
      .leftJoinAndSelect('host.agency', 'agency')
      .orderBy('host.createdAt', 'DESC');
    if (query.agencyId) {
      qb.andWhere('host.agencyId = :agencyId', { agencyId: query.agencyId });
    }
    if (query.country) {
      qb.andWhere('host.country = :country', { country: query.country.toUpperCase() });
    }
    const [items, total] = await qb.skip(skip).take(take).getManyAndCount();
    return new PaginatedResultDto(items.map((row) => this.toPublic(row)), total, page, limit);
  }

  async update(
    id: string,
    patch: Partial<Pick<HostProfile, 'agencyId' | 'country' | 'status'>>,
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    const profile = await this.findById(id);
    await this.assertWritable(profile, actor, meta);
    const before = this.toPublic(profile);
    if (patch.country) {
      patch.country = patch.country.toUpperCase();
    }
    Object.assign(profile, patch);
    const saved = await this.hosts.save(profile);
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'host.update',
      targetType: 'host',
      targetId: id,
      before,
      after: this.toPublic(saved),
      meta,
    });
    return this.toPublic(await this.findById(id));
  }

  async lockProtection(
    id: string,
    reason: string,
    caseNumber: string,
    until: Date,
    actor?: JwtPayload,
  ) {
    const profile = await this.findById(id);
    profile.protectionLockedUntil = until;
    profile.protectionReason = reason;
    profile.protectionCaseNumber = caseNumber;
    await this.hosts.save(profile);
    await this.audit.log({
      actorType: actor ? ActorType.STAFF : ActorType.SYSTEM,
      actorId: actor?.sub ?? id,
      action: 'host.protection.lock',
      targetType: 'host',
      targetId: id,
      reason,
      caseNumber,
      after: { protectionLockedUntil: until.toISOString() },
    });
    return this.toPublic(await this.findById(id));
  }

  async unlockProtection(id: string, actor: JwtPayload, meta?: RequestMetaDto) {
    this.assertMaster(actor);
    const profile = await this.findById(id);
    await this.hosts.update(id, {
      protectionLockedUntil: null,
      protectionReason: null,
      protectionCaseNumber: null,
    });
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'host.protection.unlock',
      targetType: 'host',
      targetId: id,
      meta,
    });
    return this.toPublic(await this.findById(id));
  }

  async assertWritable(profile: HostProfile, actor: JwtPayload, meta?: RequestMetaDto) {
    const locked =
      profile.protectionLockedUntil && profile.protectionLockedUntil.getTime() > Date.now();
    if (!locked) {
      return;
    }
    if (this.isMaster(actor)) {
      return;
    }
    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'host.protection.blocked',
      targetType: 'host',
      targetId: profile.id,
      reason: profile.protectionReason,
      caseNumber: profile.protectionCaseNumber,
      meta,
    });
    throw new AppException(
      'Host Protection Lock is active. Only Master Admin can change this host.',
      HttpStatus.FORBIDDEN,
    );
  }

  async freezeHost(id: string, reason: string, actor: JwtPayload, meta?: RequestMetaDto) {
    this.assertMaster(actor);
    const profile = await this.findById(id);
    profile.status = HostStatus.FROZEN;
    await this.hosts.save(profile);
    if (profile.user) {
      profile.user.status = UserStatus.BANNED;
      await this.users.save(profile.user);
    }
    await this.freeze.freeze({
      ownerType: WalletOwnerType.HOST_SALARY,
      ownerId: profile.id,
      freezeType: FreezeType.ACCOUNT,
      reason,
      actor,
      actorType: ActorType.STAFF,
      meta,
    });
    return this.toPublic(await this.findById(id));
  }

  async setSalaryPin(profileId: string, pin: string, currentPin?: string) {
    const profile = await this.hosts
      .createQueryBuilder('host')
      .addSelect('host.salaryPinHash')
      .where('host.id = :id', { id: profileId })
      .getOne();
    if (!profile) {
      throw new AppException('Host not found', HttpStatus.NOT_FOUND);
    }
    if (profile.salaryPinHash) {
      if (!currentPin || !(await comparePassword(currentPin, profile.salaryPinHash))) {
        throw new AppException('Current salary PIN is invalid', HttpStatus.FORBIDDEN);
      }
    }
    profile.salaryPinHash = await hashPassword(pin);
    await this.hosts.save(profile);
    return { set: true };
  }

  async verifySalaryPin(profileId: string, pin: string): Promise<void> {
    const profile = await this.hosts
      .createQueryBuilder('host')
      .addSelect('host.salaryPinHash')
      .where('host.id = :id', { id: profileId })
      .getOne();
    if (!profile?.salaryPinHash) {
      throw new AppException('Set a salary PIN first', HttpStatus.BAD_REQUEST);
    }
    if (!(await comparePassword(pin, profile.salaryPinHash))) {
      throw new AppException('Invalid salary PIN', HttpStatus.FORBIDDEN);
    }
  }

  async resetSalaryPin(profileId: string, pin: string) {
    const profile = await this.findById(profileId);
    profile.salaryPinHash = await hashPassword(pin);
    await this.hosts.save(profile);
    return { reset: true };
  }

  isOfficialProtectedUser(user: User): boolean {
    return Boolean(user.isOfficial);
  }

  toPublic(profile: HostProfile) {
    return {
      id: profile.id,
      userId: profile.userId,
      agencyId: profile.agencyId ?? null,
      country: profile.country,
      status: profile.status,
      protectionLocked: Boolean(
        profile.protectionLockedUntil && profile.protectionLockedUntil.getTime() > Date.now(),
      ),
      protectionLockedUntil: profile.protectionLockedUntil ?? null,
      protectionCaseNumber: profile.protectionCaseNumber ?? null,
      hasSalaryPin: undefined,
      user: profile.user
        ? {
            id: profile.user.id,
            publicId: profile.user.publicId,
            username: profile.user.username,
            displayName: profile.user.displayName,
            isOfficial: profile.user.isOfficial,
            officialId: profile.user.officialId,
            country: profile.user.country,
            status: profile.user.status,
          }
        : undefined,
      agency: profile.agency
        ? {
            id: profile.agency.id,
            displayName: profile.agency.displayName,
            country: profile.agency.country,
          }
        : null,
    };
  }

  isMaster(actor: JwtPayload): boolean {
    return actor.role === StaffRole.SUPER_ADMIN || Boolean(actor.roles?.includes(StaffRole.SUPER_ADMIN));
  }

  private assertMaster(actor: JwtPayload) {
    if (!this.isMaster(actor)) {
      throw new AppException('Master Admin only', HttpStatus.FORBIDDEN);
    }
  }
}
