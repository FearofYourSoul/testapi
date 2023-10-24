import { Prisma } from '@prisma/client';

import { ESortField } from '../dto';
import { ESortOrder } from '../../dto';

interface ISortMapper {
  sortField: ESortField;
  sortOrder: ESortOrder;
}

export const employeeSortMapper = ({
  sortField,
  sortOrder,
}: ISortMapper): Prisma.Enumerable<Prisma.OwnerOrderByWithAggregationInput> | undefined => {
  switch (sortField) {
    case ESortField.ID:
      return { id: sortOrder };
    case ESortField.EMAIL:
      return { email: sortOrder };
    case ESortField.CREATED_AT:
      return { created_at: sortOrder };
    case ESortField.UPDATED_AT:
      return { updated_at: sortOrder };
    case ESortField.NAME:
      return { name: sortOrder };
    case ESortField.PHONE_NUMBER:
      return { phone_number: sortOrder };
    case ESortField.IS_EMAIL_VERIFIED:
      return { is_email_verified: sortOrder };
    case ESortField.IS_PHONE_VERIFIED:
      return { is_phone_verified: sortOrder };
    default:
      const _exhaustiveCheck: never = sortField;
      return _exhaustiveCheck;
  }
};
