import { z } from 'zod';

export const getSubscriptionDto = z.object({
  placeId: z.string().min(8),
});
