import { z } from 'zod';

import { EErrorCode } from '../../../utils';

export const phoneAuthDto = z.object({
  phone_number: z
    .string({ required_error: EErrorCode.REQUIRED, invalid_type_error: EErrorCode.INVALID })
    .regex(/^\+?(\d{1,3})?[- .]?\(?(?:\d{2,3})\)?[- .]?\d\d\d[- .]?\d\d[- .]?\d\d$/, {
      message: `${EErrorCode.INVALID} phone_number`,
    }),
});

export const codeAuthDto = z.object({
  code: z
    .string({ required_error: EErrorCode.REQUIRED, invalid_type_error: EErrorCode.INVALID })
    .min(6, { message: EErrorCode.INVALID })
    .max(6, { message: EErrorCode.INVALID }),
  language: z.string().max(2).min(2),
});

export const mobileAuthDto = phoneAuthDto.merge(codeAuthDto);
