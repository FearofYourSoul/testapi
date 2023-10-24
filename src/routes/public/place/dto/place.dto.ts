import { z } from 'zod';
import { EPlaceExpensiveness } from '@prisma/client';

import { EPreferences, EPlaceSortTypes } from '../../../../services';

export const getPlaceDto = z.object({
  id: z.string(),
});

const options = z.object({
  category: z.array(z.string()).optional(),
  countOfPersons: z.number().optional(),
  date: z.coerce.date().optional(),
  expensiveness: z.array(z.nativeEnum(EPlaceExpensiveness)).min(1).optional(),
  search: z.string().optional(),
  countryCode: z.string().trim().min(2).max(2).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  responseTime: z.number().optional(),
  preferences: z.array(z.nativeEnum(EPreferences)).min(1).optional(),
  kitchens: z.array(z.string()).optional(),
  sortBy: z.nativeEnum(EPlaceSortTypes).optional(),
});

const page = z.object({
  limit: z.number().min(1).optional(),
  cursor: z.string().optional(),
});

export const getPlacesDto = options.merge(page).optional();

export type TGetPublicPlacesDto = z.infer<typeof getPlacesDto>;
