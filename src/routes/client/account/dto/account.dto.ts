import phone from 'phone';
import { z } from 'zod';

import { EErrorCode } from '../../../../utils';

const phoneNumber = z.string().refine((v) => !v || phone(v).isValid, {
  message: `Invalid phone_number`,
});

export const updateClientDto = z.object({
  name: z.string().min(2).optional(),
  email: z
    .string()
    .refine((v) => (!v ? undefined : z.string().email().safeParse(v).success), 'invalid email')
    .optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  phoneNumber: phoneNumber.optional(),
});

export const updatePhoneNumber = z.object({
  code: z
    .string({ required_error: EErrorCode.REQUIRED, invalid_type_error: EErrorCode.INVALID })
    .min(6, { message: EErrorCode.INVALID })
    .max(6, { message: EErrorCode.INVALID }),
  phoneNumber,
});

export const updateLocationDto = z.object({
  addressLine1: z.string().trim().min(4),
  addressLine2: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1),
  postalCode: z.string().trim().min(1).optional(),
  countryCode: z.string().trim().min(2).max(2).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updateFCMTokenDto = z.object({ expoToken: z.string().min(12) });
