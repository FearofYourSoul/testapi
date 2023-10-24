import { z } from 'zod';

export const updateOwnerDto = z.object({
  login: z.string().optional(),
  name: z.string().min(2).optional(),
});

export const updatePasswordDto = z.object({
  oldPassword: z.string(),
  password: z.string(),
});
