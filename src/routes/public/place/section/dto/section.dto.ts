import { z } from 'zod';

export const getSectionsDto = z.object({
  placeId: z.string(),
});

export const getSectionByIdDto = z.object({
  sectionId: z.string(),
});
