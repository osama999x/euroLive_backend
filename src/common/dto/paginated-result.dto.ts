export class PaginatedMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class PaginatedResultDto<T> {
  items: T[];
  meta: PaginatedMetaDto;

  constructor(items: T[], total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit) || 0;

    this.items = items;
    this.meta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
