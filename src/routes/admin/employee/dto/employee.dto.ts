import { z } from 'zod';
import { EEmployeeRole } from '@prisma/client';

import { ESortOrder, adminDefaultFilterDto } from '../../dto';

export const getEmployeeDto = z.object({
  employee_id: z.string(),
});

export const getEmployeePlacesDto = getEmployeeDto.extend({
  limit: z.number().default(12),
  cursor: z.string().optional(),
});


export enum ESortField {
  ID = 'id',
  NAME = 'name',
  EMAIL = 'email',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  ROLE = 'role',
  LOGIN = 'login',
  PHONE_NUMBER = 'phone_number',
  IS_EMAIL_VERIFIED = 'is_email_verified',
  IS_PHONE_VERIFIED = 'is_phone_verified',
  OWNER_ID = 'owner_id',
}


export const getEmployeesDto = adminDefaultFilterDto.extend({
  search: z.string().optional(),
  sort: z
    .object({
      sortField: z.nativeEnum(ESortField),
      sortOrder: z.nativeEnum(ESortOrder),
    })
    .optional(),
  roles: z.array(z.nativeEnum(EEmployeeRole)).optional(),
  need_verification: z.boolean().optional(),
});
