import { z } from 'zod';

export const addTableImagesDto = z.object({
  tableId: z.string(),
  images: z.array(z.string()).max(6, { message: 'max_length' }),
});

export const deleteImageDto = z.object({
  id: z.string(),
});
