import { Prisma } from '@prisma/client';

import { ESortField } from '../dto';
import { ESortOrder } from '../../dto';

interface ISortMapper {
  sortField: ESortField;
  sortOrder: ESortOrder;
}

export const clientSortMapper = ({
  sortField,
  sortOrder,
}: ISortMapper): Prisma.Enumerable<Prisma.ClientOrderByWithAggregationInput> | undefined => {
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
      return [{ first_name: sortOrder }, { last_name: sortOrder }];
    case ESortField.PHONE_NUMBER:
      return { phone_number: sortOrder };
    case ESortField.VERIFICATION_CODE:
      return { verification_code: sortOrder };
    case ESortField.DATE_BIRTH:
      return { date_birth: sortOrder };
    default:
      const _exhaustiveCheck: never = sortField;
      return _exhaustiveCheck;
  }
};
