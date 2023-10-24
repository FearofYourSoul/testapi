import phone from 'phone';
import { z } from 'zod';
import { EEmployeeRole } from '@prisma/client';

import { EErrorCode } from '../../../utils';

export const emailSchemaDto = z
  .string({ required_error: EErrorCode.REQUIRED, invalid_type_error: EErrorCode.INVALID });

export const emailAuthDto = z.object({
  email: emailSchemaDto,
});

export const loginAuthDto = z.string().regex(/^(?=.*[A-Za-z0-9]$)[A-Za-z][A-Za-z\d.-]{4,19}$/, 'Invalid login');

export const passwordAuthDto = z
  .string()
  .min(6, { message: EErrorCode.INVALID })
  .regex(/.*[A-Z].*/, { message: EErrorCode.INVALID })
  .regex(/.*[a-z].*/, { message: EErrorCode.INVALID })
  .regex(new RegExp('.*\\d.*'), { message: EErrorCode.INVALID });

export const tokenSchemaDto = z
  .string({ required_error: EErrorCode.REQUIRED, invalid_type_error: EErrorCode.INVALID });

export const tokenDto = z.object({
  token: tokenSchemaDto,
});

export const ownerPhoneDto = z.object({
  name: z.string(),
  phoneNumber: z.string().refine((number) => {
    return phone(number.slice(0, 1) !== '+' ? `+${number}` : number).isValid;
  }, 'Invalid phone number'),
});

export const resetPasswordDro = z.object({
  email: emailSchemaDto,
  password: passwordAuthDto,
  token: tokenSchemaDto,
});

export const managerWSToken = z.object({
  placeId: z.string(),
});

export const managerAuthDto = z.object({
  login: z.union([loginAuthDto, z.string().email()]),
  password: passwordAuthDto,
});

export const webAuthDto = z.object({
  email: emailSchemaDto,
  password: passwordAuthDto,
});

export const employeeAuthDto = z.object({
  login: loginAuthDto,
  password: passwordAuthDto,
});

export const emailAndLoginDto = z.object({
  login: loginAuthDto,
  email: emailSchemaDto,
});

export const ownerSignUpDto = ownerPhoneDto.merge(webAuthDto);
