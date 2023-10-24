import { EBookingStatus } from '@prisma/client';
import phone from 'phone';
import { z } from 'zod';

export enum EBookingsPages {
  ARCHIVE = 'archive',
  WAITING = 'waiting',
  OPEN = 'open',
  NEW = 'new',
}

export const changeBookingStatusDto = z.object({
  bookingId: z.string(),
  status: z.nativeEnum(EBookingStatus),
  endTime: z.coerce.date().optional(),
});

export const createBookingDto = z.object({
  tableId: z.string(),
  phoneNumber: z.string().optional().refine((v) => !v || phone(v).isValid, 'Invalid phone number'),
  name: z.string().min(3),
  personsCount: z.number(),
  period: z.object({
    startTime: z.string(),
    endTime: z.string(),
  }),
  status: z.nativeEnum(EBookingStatus),
});

export const getBookingDto = z.object({
  bookingId: z.string(),
});

const period = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

const options = z.object({
  period: period.optional(),
  status: z.array(z.nativeEnum(EBookingStatus)).optional(),
  mode: z.nativeEnum(EBookingsPages).optional(),
  search: z.string().optional(),
  sectionIds: z.array(z.string()).optional(),
});

const page = z.object({
  limit: z.number().default(12),
  cursor: z.string().optional(),
});

export const getBookingsDto = z
  .object({
    placeId: z.string(),
  })
  .merge(options)
  .merge(page);

export const getConflictsDto = z.object({
  tableId: z.string(),
  period,
  excludeIds: z.array(z.string()).optional(),
});

export const getClientBookingsDto = z.object({
  clientId: z.string(),
  placeId: z.string().optional(),
  tableId: z.string().optional(),
  bookingsTypes: z.array(z.nativeEnum(EBookingStatus)).optional(),
  limit: z.number().optional(),
  cursor: z.string().optional(),
});

export const getTableBookingsDto = z.object({
  cursor: z.string().optional(),
  limit: z.number().default(12),
  period,
  tableId: z.string(),
});

export const updateBookingDto = z.object({
  bookingId: z.string(),
  endTime: z.coerce.date().optional(),
  startTime: z.coerce.date().optional(),
  managerComment: z.string().optional(),
  tableId: z.string().optional(),
  personsAmount: z.number().optional(),
});

export const changeStatusBookingDto = getBookingDto;

export type TChangeBookingStatusDto = z.infer<typeof changeBookingStatusDto>;
