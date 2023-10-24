import { z } from 'zod';

export const getPlacesLocationDto = z.object({
  query: z.string().trim().min(1),
  region: z.string().trim().min(2).max(2).optional(),
  language: z.string().trim().min(2).max(2).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().min(1000).optional(),
});
