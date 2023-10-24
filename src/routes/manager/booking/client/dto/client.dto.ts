import { z } from 'zod';

const field = z.object({
  name: z.string(),
  rating: z.number().optional(),
});

export const leaveReviewDto = z.object({
  bookingId: z.string(),
  comment: z.string().optional(),
  fields: z.array(field),
});

export const preorderListDto = z.object({
  bookingId: z.string(),
});
