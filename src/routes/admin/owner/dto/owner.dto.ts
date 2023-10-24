import { z } from 'zod';

import { ESortOrder, adminDefaultFilterDto } from '../../dto';

export const getOwnerDto = z.object({
  owner_id: z.string(),
});

export const getOwnerPlacesDto = getOwnerDto.extend({
  limit: z.number().default(12),
  cursor: z.string().optional(),
});

export enum ESortField {
  ID = 'id',
  NAME = 'name',
  EMAIL = 'email',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  PHONE_NUMBER = 'phone_number',
  IS_EMAIL_VERIFIED = 'is_email_verified',
  IS_PHONE_VERIFIED = 'is_phone_verified',
}

export const getOwnersDto = adminDefaultFilterDto.extend({
  search: z.string().optional(),
  sort: z
    .object({
      sortField: z.nativeEnum(ESortField),
      sortOrder: z.nativeEnum(ESortOrder),
    })
    .optional(),
  need_verification: z.boolean().optional(),
});
