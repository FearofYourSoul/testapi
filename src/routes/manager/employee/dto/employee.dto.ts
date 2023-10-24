import { EEmployeeRole } from '@prisma/client';
import { z } from 'zod';

import { loginAuthDto, passwordAuthDto } from '../../../auth/dto';
import { EErrorCode } from '../../../../utils';

const employeeInfo = z.object({
  role: z.nativeEnum(EEmployeeRole),
  name: z.string().min(2),
  email: z.string().email().optional(),
  placesIds: z.array(z.string()),
});

const employeeMainInfo = employeeInfo.merge(z.object({ login: loginAuthDto }));

export const createEmployeeDto = employeeMainInfo.merge(z.object({ password: passwordAuthDto }));

export const getEmployeeDto = z.object({
  employeeId: z.string(),
});

export const deleteEmployeeDto = getEmployeeDto;

export const getEmployeesDto = z.object({
  type: z.array(z.nativeEnum(EEmployeeRole)).optional(),
  search: z.string().optional(),
  limit: z.number().default(12),
  cursor: z.string().optional(),
  placesIds: z.array(z.string()).optional(),
});

export const employeeIdDto = z.object({
  employeeId: z.string(),
});

export const updateEmployeeDto = employeeIdDto.merge(employeeMainInfo.partial());

export const updatePasswordDto = z.object({
  employeeId: z.string(),
  password: z
    .string()
    .min(6, { message: EErrorCode.INVALID })
    .regex(/.*[A-Z].*/, { message: EErrorCode.INVALID })
    .regex(/.*[a-z].*/, { message: EErrorCode.INVALID })
    .regex(new RegExp('.*\\d.*'), { message: EErrorCode.INVALID }),
});
