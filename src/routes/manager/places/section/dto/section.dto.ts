import { z } from 'zod';
import { EPlaceDecorType } from '@prisma/client';

import { updateTableDto } from '../table/dto';
import { workingHours } from '../../workingHours/dto';

// export const depositSchema = z.object({
//   isSame: z.literal<boolean>(false),
//   depositValue: z.preprocess(
//     (v) => (!v && v !== 0 ? undefined : Number(v)),
//     z
//       .number()
//       .nonnegative()
//       .multipleOf(0.01)
//       .transform((v) => Number(v.toFixed(2)))
//   ),
// });

// type TDepositSchema = z.infer<typeof depositSchema>;
const workingHoursSchema = z.object({
  isSame: z.literal<boolean>(false),
  hours: z.array(workingHours).min(7).max(7),
});

export type TWorkingHours = z.infer<typeof workingHoursSchema>;

export const createSectionDto = z.object({
  name: z.string().min(1),
  placeId: z.string(),
  isTerrace: z.boolean(),
  isVisible: z.boolean(),
  // deposit: z
  //   .object({
  //     isSame: z.literal<boolean>(true),
  //   })
  //   .or(depositSchema),
  workingHours: z
    .object({
      isSame: z.literal<boolean>(true),
    })
    .or(workingHoursSchema),
});

export const getSectionDto = z.object({
  sectionId: z.string(),
});

export const deleteSectionDto = getSectionDto;
export const setDefaultDto = getSectionDto.extend({
  placeId: z.string(),
});

const updateDecorDto = z.object({
  id: z.string(),
  sectionId: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  type: z.nativeEnum(EPlaceDecorType).optional(),
  angle: z.number().optional(),
});

export const updateSectionDto = z.object({
  sectionId: z.string(),
  placeId: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  externalId: z.string().optional(),
  isDefault: z.boolean().optional(),
  tables: z.array(updateTableDto).optional(),
  decor: z.array(updateDecorDto).optional(),
});
