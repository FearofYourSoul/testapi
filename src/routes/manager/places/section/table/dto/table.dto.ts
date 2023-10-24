import { z } from 'zod';
import { EPlaceTableShape } from '@prisma/client';

export const getTablesDto = z.object({
  sectionId: z.string(),
});

export const getTableByIdDto = z.object({
  tableId: z.string(),
});

const images = z.object({
  addedImages: z.array(z.string()).max(6).optional(),
  deletedImages: z.array(z.string()).max(6).optional(),
});

export const createTableDto = z.object({
  sectionId: z.string(),
  name: z.string().min(1),
  seats: z.number().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  externalId: z.string(),
  shape: z.nativeEnum(EPlaceTableShape).optional(),
  angle: z.number().optional(),
  isActive: z.boolean().optional(),
  available_for_online: z.boolean().optional(),
  images: images.optional(),
  // deposit: z
  //   .object({
  //     isSame: z.literal<boolean>(true),
  //   })
  //   .or(depositSchema)
});

export const makeTableActiveDto = getTableByIdDto;
export const deleteTableDto = getTableByIdDto;

export const updateTableDto = createTableDto.partial().extend({
  id: z.string(),
});
