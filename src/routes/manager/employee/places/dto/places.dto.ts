import { z } from 'zod';

export const applyPlaceDto = z.object({
  placesIds: z.array(z.string()),
  employeeId: z.string(),
});
