import { EDayOfWeek } from '@prisma/client';
import { z } from 'zod';

export const workingHours = z.object({
  day: z.nativeEnum(EDayOfWeek),
  is_day_off: z.boolean().optional(),
  is_working_all_day: z.boolean().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
})

export const updateWorkingHours = z.object({
  placeId: z.string(),
  workingHours: z.array(workingHours).max(7).min(7),
});
