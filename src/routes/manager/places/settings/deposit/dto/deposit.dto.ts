import { EDepositInteraction } from '@prisma/client';
import { z } from 'zod';

export const createDepositSettingsDto = z.object({
  place_id: z.string(),
  person_price: z.number().optional(),
  table_price: z.number().optional(),
  is_person_price: z.boolean().optional(),
  is_table_price: z.boolean().optional(),
  interaction: z.nativeEnum(EDepositInteraction).optional(),
});

export const updateDepositSettingsDto = z.object({
  place_id: z.string(),
  person_price: z.number().optional(),
  table_price: z.number().optional(),
  is_person_price: z.boolean().optional(),
  is_table_price: z.boolean().optional(),
  interaction: z.nativeEnum(EDepositInteraction).optional(),
  deletedExceptions: z.array(z.string()).optional(),
});

export const createDepositExceptionSettingsDto = z.object({
  place_id: z.string(),
  person_price: z.number().optional(),
  table_price: z.number().optional(),
  is_person_price: z.boolean().optional(),
  is_table_price: z.boolean().optional(),
  for_days_of_week: z.boolean().optional(),
  is_all_day: z.boolean().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  days: z.string().optional(),
});
