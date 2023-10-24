import { EPlaceExpensiveness, Prisma } from '@prisma/client';
import z from 'zod';

const options = z.object({
  search: z.string().optional(),
  category: z.array(z.string()).optional(),
  expensiveness: z.array(z.nativeEnum(EPlaceExpensiveness)).min(1).optional(),
});

const page = z.object({
  limit: z.number().default(12),
  cursor: z.string().optional(),
});

export const getPlacesDto = options.merge(page);

export const createPlaceDto = z.object({
  iikoKey: z.string().optional(),
  name: z.string(),
  category: z.array(z.string()).optional(),
  kitchen: z.array(z.string()).optional(),
  description: z.string().optional(),
  expensiveness: z.nativeEnum(EPlaceExpensiveness).optional(),
  logoUrl: z.string().optional(), // TODO change baseurl64
});


export const getPlaceDto = z.object({
  placeId: z.string(),
});

export const updatePlaceDto = getPlaceDto.merge(createPlaceDto.partial());
export const deletePlaceDto = getPlaceDto;
export const publishPlaceDto = getPlaceDto;

export const excludePlaceKeysCheck: Array<keyof Prisma.PlaceSelect> = ['deleted_at', 'iiko_Place_id'];
