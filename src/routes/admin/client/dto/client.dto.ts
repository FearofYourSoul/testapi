import { z } from 'zod';

import { ESortOrder, adminDefaultFilterDto } from '../../dto';

export enum ESortField {
  ID = 'id',
  NAME = 'name',
  EMAIL = 'email',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  DATE_BIRTH = 'date_birth',
  VERIFICATION_CODE = 'verification_code',
  PHONE_NUMBER = 'phone_number',
}

export const getClientDto = z.object({
  client_id: z.string(),
});

export const getClientBookingTablesDto = getClientDto.extend({
  limit: z.number().default(12),
  cursor: z.string().optional(),
});

export const getClientsDto = adminDefaultFilterDto.extend({
  page: z.number().default(1),
  search: z.string().optional(),
  sort: z
    .object({
      sortField: z.nativeEnum(ESortField),
      sortOrder: z.nativeEnum(ESortOrder),
    })
    .optional(),
});
