import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions';
import { CatalogItemType } from '../../common/enums';
import { PaginationQueryDto, PaginatedResultDto } from '../../common/dto';
import { getPagination } from '../../common/utils';
import { CatalogItem } from '../../database/entities';

export interface CatalogItemInput {
  type: CatalogItemType;
  name: string;
  description?: string;
  assetUrl?: string;
  price?: number;
  isActive?: boolean;
  resellerAccess?: boolean;
  eligibility?: string;
  defaultExpiryDays?: number;
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(CatalogItem)
    private readonly items: Repository<CatalogItem>,
  ) {}

  async create(input: CatalogItemInput): Promise<CatalogItem> {
    const item = this.items.create({
      ...input,
      price: input.price ?? 0,
      isActive: input.isActive ?? true,
      resellerAccess: input.resellerAccess ?? false,
      eligibility: input.eligibility ?? 'all',
    });
    return this.items.save(item);
  }

  async update(id: string, input: Partial<CatalogItemInput>): Promise<CatalogItem> {
    const item = await this.findById(id);
    Object.assign(item, input);
    return this.items.save(item);
  }

  async findById(id: string): Promise<CatalogItem> {
    const item = await this.items.findOne({ where: { id } });
    if (!item) {
      throw new AppException('Catalog item not found', HttpStatus.NOT_FOUND);
    }
    return item;
  }

  async list(
    query: PaginationQueryDto & { type?: CatalogItemType; resellerAccess?: boolean },
  ): Promise<PaginatedResultDto<CatalogItem>> {
    const { skip, take, page, limit } = getPagination(query);
    const qb = this.items.createQueryBuilder('item').orderBy('item.createdAt', 'DESC');

    if (query.type) {
      qb.andWhere('item.type = :type', { type: query.type });
    }
    if (query.resellerAccess === true) {
      qb.andWhere('item.resellerAccess = true');
      qb.andWhere('item.isActive = true');
    }

    const [rows, total] = await qb.skip(skip).take(take).getManyAndCount();
    return new PaginatedResultDto(rows, total, page, limit);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findById(id);
    await this.items.softRemove(item);
  }

  async assertAssignableByReseller(item: CatalogItem, type: CatalogItemType): Promise<void> {
    if (item.type !== type) {
      throw new AppException('Catalog item type mismatch', HttpStatus.BAD_REQUEST);
    }
    if (!item.isActive) {
      throw new AppException('Catalog item is disabled', HttpStatus.BAD_REQUEST);
    }
    if (!item.resellerAccess) {
      throw new AppException(
        'This item is not available to resellers',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
