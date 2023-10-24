import { z } from 'zod';

export const stringDate = z
  .string()
  .refine((value) => new Date(value).toDateString() !== 'Invalid Date', 'Invalid Date string format');

export const bookTableDto = z.object({
  comment: z.string().optional(),
  menuItems: z.array(z.object({ id: z.string(), count: z.number() })).optional(),
  numberPersons: z.number(),
  tableId: z.string(),
  timeEnd: stringDate,
  timeStart: stringDate,
  theme: z.enum(['dark', 'light']),
});

export const getBookingsListDto = z.object({
  cursor: z.string().optional(),
  isNeedActive: z.boolean().optional(),
  limit: z.number().default(10),
});

export const getBookingDto = z.object({
  bookingId: z.string(),
});

export type TBookTableDto = z.infer<typeof bookTableDto>;
