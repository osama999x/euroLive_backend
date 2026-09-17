import { PaginationQueryDto } from '../dto';

export function getPagination(query: PaginationQueryDto): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const page = query.page || 1;
  const limit = query.limit || 20;

  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
}
