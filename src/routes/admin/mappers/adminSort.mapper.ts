import { Prisma } from '@prisma/client';

import { ESortField, ESortOrder } from '../dto';

interface ISortMapper {
  sortField: ESortField;
  sortOrder: ESortOrder;
}

export const adminSortMapper = ({
  sortField,
  sortOrder,
}: ISortMapper): Prisma.Enumerable<Prisma.AdminOrderByWithAggregationInput> | undefined => {
  switch (sortField) {
    case ESortField.ID:
      return { id: sortOrder };
    case ESortField.EMAIL:
      return { email: sortOrder };
    case ESortField.CREATED_AT:
      return { created_at: sortOrder };
    case ESortField.UPDATED_AT:
      return { updated_at: sortOrder };
    default:
      const _exhaustiveCheck: never = sortField;
      return _exhaustiveCheck;
  }
};
