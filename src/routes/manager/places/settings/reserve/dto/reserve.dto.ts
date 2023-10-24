import { z } from 'zod';

export const getReservesSettingsDto = z.object({
  placeId: z.string(),
});

export const updateReservesSettingsDto = z.object({
  placeId: z.string(),
  responseTime: z.number().min(300).max(1800).optional(),
  unreachableInterval: z.number().min(0).max(7200).optional(),
  delayedResponseTime: z.number().min(900).max(7200).optional(),
  timeBetweenReserves: z.number().min(0).max(1800).optional(),
  minBookingTime: z.number().min(1800).max(14400).optional(),
  maxBookingTime: z.number().min(10800).max(28800).optional(),
});
