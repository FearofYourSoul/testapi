import { z } from 'zod';

export const countNotificationsDto = z.object({
  placeId: z.string(),
});

export const notificationListDto = z
  .object({
    limit: z.number().default(12),
    cursor: z.string().optional(),
  })
  .merge(countNotificationsDto);

export const makeViewedDto = z.object({
  notificationId: z.string(),
});
