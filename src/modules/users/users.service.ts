import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import { UserStatus, WalletOwnerType } from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { generatePublicId, getPagination } from '../../common/utils';
import { User } from '../../database/entities';
import { WalletService } from '../wallet/wallet.service';

export interface CreateUserInput {
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  country?: string;
  gender?: string;
  bio?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly wallets: WalletService,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const usernameTaken = await this.users.findOne({
      where: { username: input.username },
    });
    if (usernameTaken) {
      throw new AppException('Username already exists', HttpStatus.CONFLICT);
    }

    const user = this.users.create({
      ...input,
      publicId: await this.uniquePublicId(),
      status: UserStatus.ACTIVE,
      deviceIds: [],
    });
    const saved = await this.users.save(user);
    await this.wallets.getOrCreateWallet(WalletOwnerType.USER, saved.id);
    return saved;
  }

  async findById(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new AppException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async findByPublicId(publicId: string): Promise<User> {
    const user = await this.users.findOne({ where: { publicId } });
    if (!user) {
      throw new AppException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async search(
    query: PaginationQueryDto & { search?: string; status?: UserStatus },
  ): Promise<PaginatedResultDto<User>> {
    const { skip, take, page, limit } = getPagination(query);
    const qb = this.users.createQueryBuilder('user').orderBy('user.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(
        '(user.username ILIKE :q OR user.publicId ILIKE :q OR user.displayName ILIKE :q OR user.email ILIKE :q)',
        { q: `%${query.search}%` },
      );
    }

    const [items, total] = await qb.skip(skip).take(take).getManyAndCount();
    return new PaginatedResultDto(items, total, page, limit);
  }

  async setBanned(id: string, banned: boolean): Promise<User> {
    const user = await this.findById(id);
    user.status = banned ? UserStatus.BANNED : UserStatus.ACTIVE;
    return this.users.save(user);
  }

  async assertActive(user: User): Promise<void> {
    if (user.status === UserStatus.BANNED) {
      throw new AppException('User is banned', HttpStatus.FORBIDDEN);
    }
  }

  private async uniquePublicId(): Promise<string> {
    for (let i = 0; i < 8; i += 1) {
      const publicId = generatePublicId();
      const exists = await this.users.findOne({ where: { publicId } });
      if (!exists) {
        return publicId;
      }
    }
    throw new AppException('Could not allocate public ID', HttpStatus.CONFLICT);
  }
}
