import { z } from 'zod';

export const getMenuList = z.object({
  placeId: z.string(),
  search: z.string().optional(),
});

export const getMenuItemsList = z
  .object({
    categories: z.array(z.string()).optional(),
  })
  .merge(getMenuList);

export const isPlaceHaveMenuDto = z.object({
  placeId: z.string(),
});
