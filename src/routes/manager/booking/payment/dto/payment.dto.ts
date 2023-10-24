import { z } from 'zod';

const field = z.object({
  itemId: z.string(),
  count: z.number(),
});

export const refundDto = z.object({
  bookingId: z.string(),
  placeId: z.string(),
  depositId: z.string().optional(),
  menuItems: z.array(field).optional(),
});

export const refundTransactionsDto = z.object({
  bookingId: z.string(),
});
