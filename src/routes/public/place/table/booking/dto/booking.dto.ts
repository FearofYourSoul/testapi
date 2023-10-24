import { z } from 'zod';

const timestamp = z
  .string()
  .refine((value) => new Date(value).toDateString() !== 'Invalid Date', 'Invalid Date string format');

export const getBookingsTable = z.object({
  tableId: z.string(),
  timestamp,
});

export const getBookingsTables = z.object({
  timestamp,
  sectionId: z.string(),
});

export const checkBookingStatusDto = z.object({
  bookingId: z.string(),
});
