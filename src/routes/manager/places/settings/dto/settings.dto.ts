import { z } from 'zod';
import phone from 'phone';

import { EErrorCode } from '../../../../../utils';
import { createSectionDto } from '../../section/dto';

export const updateMainSettingsDto = z.object({
  placeId: z.string(),
  phoneNumber: z
    .string({ invalid_type_error: EErrorCode.INVALID })
    .refine((v) => phone(v).isValid, {
      message: `${EErrorCode.INVALID} phone_number`,
    })
    .optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  name: z.string().optional(),
  addressLine: z.string().optional(),
});

export const updateSectionSettingsDto = createSectionDto.partial().extend({
  sectionId: z.string(),
});
