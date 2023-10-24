import { z } from 'zod';

export const getTableDto = z.object({
  tableId: z.string(),
});

export const getTablesDto = z.object({
  sectionId: z.string(),
});
