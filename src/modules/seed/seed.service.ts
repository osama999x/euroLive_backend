import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountStatus, CatalogItemType, StaffRole, UserStatus } from '../../common/enums';
import { hashPassword } from '../../common/utils';
import {
  CatalogItem,
  Permission,
  Role,
  StaffUser,
  User,
} from '../../database/entities';
import { WalletService } from '../../modules/wallet/wallet.service';
import { WalletOwnerType } from '../../common/enums';

const ROLE_SEED: { slug: StaffRole; name: string }[] = [
  { slug: StaffRole.SUPER_ADMIN, name: 'Super Admin' },
  { slug: StaffRole.ADMIN, name: 'Admin' },
  { slug: StaffRole.FINANCE, name: 'Finance Admin' },
  { slug: StaffRole.SUPPORT, name: 'Support' },
  { slug: StaffRole.MODERATOR, name: 'Moderator' },
];

const PERMISSION_SEED = [
  { slug: 'admin.dashboard', name: 'View dashboard' },
  { slug: 'admin.users', name: 'Manage users' },
  { slug: 'admin.resellers', name: 'Manage resellers' },
  { slug: 'admin.wallets', name: 'Adjust wallets' },
  { slug: 'admin.catalog', name: 'Manage catalog' },
  { slug: 'admin.roles', name: 'Manage roles' },
  { slug: 'admin.audit', name: 'View audit logs' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [StaffRole.SUPER_ADMIN]: PERMISSION_SEED.map((p) => p.slug),
  [StaffRole.ADMIN]: [
    'admin.dashboard',
    'admin.users',
    'admin.resellers',
    'admin.wallets',
    'admin.catalog',
    'admin.audit',
  ],
  [StaffRole.FINANCE]: ['admin.dashboard', 'admin.wallets', 'admin.resellers'],
  [StaffRole.SUPPORT]: ['admin.dashboard', 'admin.users'],
  [StaffRole.MODERATOR]: ['admin.dashboard', 'admin.users'],
};

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
    @InjectRepository(StaffUser)
    private readonly staffUsers: Repository<StaffUser>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(CatalogItem)
    private readonly catalog: Repository<CatalogItem>,
    private readonly wallets: WalletService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedRolesAndPermissions();
      await this.seedSuperAdmin();
      await this.seedDemoUser();
      await this.seedCatalog();
    } catch (error) {
      if (this.isMissingRelation(error)) {
        this.logger.error(
          'Database schema is missing. Run `npm run migration:run` then restart the API.',
        );
        return;
      }
      throw error;
    }
  }

  private isMissingRelation(error: unknown): boolean {
    const err = error as { code?: string; driverError?: { code?: string } };
    return err.code === '42P01' || err.driverError?.code === '42P01';
  }

  private async seedRolesAndPermissions() {
    const permissionEntities: Permission[] = [];
    for (const row of PERMISSION_SEED) {
      let permission = await this.permissions.findOne({ where: { slug: row.slug } });
      if (!permission) {
        permission = await this.permissions.save(this.permissions.create(row));
      }
      permissionEntities.push(permission);
    }

    for (const row of ROLE_SEED) {
      let role = await this.roles.findOne({
        where: { slug: row.slug },
        relations: ['permissions'],
      });
      if (!role) {
        role = this.roles.create({ slug: row.slug, name: row.name });
      }
      const slugs = ROLE_PERMISSIONS[row.slug] ?? [];
      role.permissions = permissionEntities.filter((p) => slugs.includes(p.slug));
      await this.roles.save(role);
    }
  }

  private async seedSuperAdmin() {
    const email = this.config.get<string>('SEED_ADMIN_EMAIL') || 'admin@kinglive.local';
    const username = this.config.get<string>('SEED_ADMIN_USERNAME') || 'superadmin';
    const password =
      this.config.get<string>('SEED_ADMIN_PASSWORD') || 'ChangeMe@Admin1';

    const existing = await this.staffUsers.findOne({ where: { email } });
    if (existing) {
      return;
    }

    const superAdmin = await this.roles.findOne({
      where: { slug: StaffRole.SUPER_ADMIN },
    });
    if (!superAdmin) {
      this.logger.error('Super admin role missing; skip staff seed');
      return;
    }

    const staff = this.staffUsers.create({
      email,
      username,
      passwordHash: await hashPassword(password),
      status: AccountStatus.ACTIVE,
      totpEnabled: false,
      roles: [superAdmin],
    });
    await this.staffUsers.save(staff);
    this.logger.log(`Seeded Super Admin ${email} / ${username}`);
  }

  private async seedDemoUser() {
    const existing = await this.users.findOne({ where: { username: 'demo_user' } });
    if (existing) {
      return;
    }

    const user = await this.users.save(
      this.users.create({
        publicId: '10000001',
        username: 'demo_user',
        displayName: 'Demo User',
        country: 'PK',
        status: UserStatus.ACTIVE,
        deviceIds: [],
      }),
    );
    await this.wallets.getOrCreateWallet(WalletOwnerType.USER, user.id);
    this.logger.log('Seeded demo consumer user publicId=10000001');
  }

  private async seedCatalog() {
    const count = await this.catalog.count();
    if (count > 0) {
      return;
    }

    await this.catalog.save([
      this.catalog.create({
        type: CatalogItemType.FRAME,
        name: 'Gold Frame',
        description: 'Seed frame for reseller assignment',
        price: 100,
        isActive: true,
        resellerAccess: true,
        eligibility: 'all',
        defaultExpiryDays: 7,
      }),
      this.catalog.create({
        type: CatalogItemType.ENTRY,
        name: 'Lion Entry',
        description: 'Seed entry effect',
        price: 250,
        isActive: true,
        resellerAccess: true,
        eligibility: 'all',
        defaultExpiryDays: 7,
      }),
      this.catalog.create({
        type: CatalogItemType.BADGE,
        name: 'Verified Badge',
        description: 'Seed badge',
        price: 50,
        isActive: true,
        resellerAccess: true,
        eligibility: 'all',
      }),
    ]);
    this.logger.log('Seeded catalog frames/entries/badges');
  }
}
