import { z } from 'zod';

export enum ESortField {
  ID = 'id',
  EMAIL = 'email',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
}

export enum ESortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export const getAdminDto = z.object({
  admin_id: z.string().optional(),
});

export const adminDefaultFilterDto = z.object({
  page: z.number().default(1),
  limit: z.number().default(12),
})

export const getAdminsDto = adminDefaultFilterDto.extend({
  sort: z
    .object({
      sortField: z.nativeEnum(ESortField),
      sortOrder: z.nativeEnum(ESortOrder),
    })
    .optional(),
});
