import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import { AccountStatus, ActorType, StaffRole } from '../../common/enums';
import { hashPassword } from '../../common/utils';
import { Permission, Role, StaffUser } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { toStaffPublic } from '../identity/staff.mapper';
import { JwtPayload } from '../../common/interfaces';
import { RequestMetaDto } from '../../common/decorators';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
    @InjectRepository(StaffUser)
    private readonly staffUsers: Repository<StaffUser>,
    private readonly audit: AuditService,
  ) {}

  listRoles() {
    return this.roles.find({ order: { name: 'ASC' } });
  }

  listPermissions() {
    return this.permissions.find({ order: { slug: 'ASC' } });
  }

  async listStaff() {
    const rows = await this.staffUsers.find({
      relations: ['roles'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => toStaffPublic(row));
  }

  async createStaff(
    input: {
      email: string;
      username: string;
      password: string;
      roleSlugs: string[];
    },
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    const exists = await this.staffUsers.findOne({
      where: [{ email: input.email }, { username: input.username }],
    });
    if (exists) {
      throw new AppException('Staff email or username already exists', HttpStatus.CONFLICT);
    }

    const roleEntities = await this.roles.find({
      where: { slug: In(input.roleSlugs?.length ? input.roleSlugs : [StaffRole.SUPPORT]) },
    });
    if (!roleEntities.length) {
      throw new AppException('No matching roles found', HttpStatus.BAD_REQUEST);
    }

    const staff = this.staffUsers.create({
      email: input.email.toLowerCase(),
      username: input.username,
      passwordHash: await hashPassword(input.password),
      status: AccountStatus.ACTIVE,
      roles: roleEntities,
    });
    const saved = await this.staffUsers.save(staff);

    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'staff.create',
      targetType: 'staff',
      targetId: saved.id,
      after: toStaffPublic(saved),
      meta,
    });

    return toStaffPublic(
      await this.staffUsers.findOne({
        where: { id: saved.id },
        relations: ['roles'],
      }),
    );
  }

  async assignRoles(
    staffId: string,
    roleSlugs: string[],
    actor: JwtPayload,
    meta?: RequestMetaDto,
  ) {
    const staff = await this.staffUsers.findOne({
      where: { id: staffId },
      relations: ['roles'],
    });
    if (!staff) {
      throw new AppException('Staff user not found', HttpStatus.NOT_FOUND);
    }

    const roleEntities = await this.roles.find({ where: { slug: In(roleSlugs) } });
    if (roleEntities.length !== roleSlugs.length) {
      throw new AppException('One or more roles were not found', HttpStatus.BAD_REQUEST);
    }

    const before = toStaffPublic(staff);
    staff.roles = roleEntities;
    await this.staffUsers.save(staff);
    const after = toStaffPublic(
      await this.staffUsers.findOne({ where: { id: staffId }, relations: ['roles'] }),
    );

    await this.audit.log({
      actorType: ActorType.STAFF,
      actorId: actor.sub,
      action: 'staff.roles',
      targetType: 'staff',
      targetId: staffId,
      before,
      after,
      meta,
    });

    return after;
  }
}
