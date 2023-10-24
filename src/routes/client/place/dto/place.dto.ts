import { z } from 'zod';

import { stringDate } from '../../booking/dto';

export const getVisitedDto = z.object({
  limit: z.number().default(8),
  cursor: z.string().optional(),
});

export const getPlaceDeposit = z.object({
  timeEnd: stringDate,
  timeStart: stringDate,
  numberPersons: z.number(),
  placeId: z.string(),
});
