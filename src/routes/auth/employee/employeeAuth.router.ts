import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';

import { authService, emailService, EStrategy } from '../../../services';
import { ESuccessCode } from '../../../utils';
import { publicProcedure, router } from '../../createRouter';
import { emailAuthDto, resetPasswordDro, tokenDto } from '../dto';
import { logger } from '../../../log';

export const employeeAuthRouter = router({
  sendVerification: publicProcedure.input(emailAuthDto).mutation(async ({ ctx: { prisma }, input }) => {
    const existingEmployee = await prisma.employee.findFirst({
      where: { email: input.email },
    });

    if (!existingEmployee) {
      logger.info(`attempted to send verification for employee that doesn't exist. Email: ${input.email}`);
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Employee with such email not found',
      });
    }

    const access_token = jwt.sign({ id: existingEmployee.id }, process.env.VERIFICATION_JWT_SECRET_KEY || '', {
      expiresIn: process.env.VERIFICATION_EXPIRES_IN,
    });

    await emailService.sendMessage(
      'email_verification',
      {
        url: `${process.env.MANAGER_APP_URL}/employee/verification?token=${access_token}`,
      },
      {
        to: input.email,
        // TODO: lang
        subject: 'Проверка почты',
      },
    );
  }),
  verify: publicProcedure.input(tokenDto).mutation(async ({ ctx: { req, prisma }, input }) => {
    const payload = jwt.verify(input.token, process.env.VERIFICATION_JWT_SECRET_KEY || '') as jwt.JwtPayload | null;

    if (!payload) {
      logger.info(`Unable to verify employee. Unable to extract payload. Token: **********${input.token.slice(-4)}`);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    let employee;

    try {
      employee = await prisma.employee.update({
        where: {
          id: payload.id,
        },
        data: {
          is_email_verified: true,
        },
        select: {
          id: true,
          email: true,
        },
      });
    } catch (e) {
      logger.warn(`Unable to verify employee. Error updating employee: ${e}`);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    const { accessToken, refreshToken } = authService.generateTokens({ id: employee.id }, { type: EStrategy.OWNER });

    await prisma.refreshToken.create({
      data: {
        // ip: req.ip,
        user_agent: req.headers['user-agent'] || '',
        token: authService.hash(refreshToken.split('.')[2]),
        employee_id: employee.id,
      },
    });

    await prisma.refreshToken.upsert({
      where: {
        user_agent_employee_id: {
          // ip: req.ip,
          user_agent: req.headers['user-agent'] || '',
          employee_id: employee.id,
        },
      },
      update: {
        token: authService.hash(refreshToken.split('.')[2]),
      },
      create: {
        // ip: req.ip,
        user_agent: req.headers['user-agent'] || '',
        token: authService.hash(refreshToken.split('.')[2]),
        employee_id: employee.id,
      },
    });

    return {
      employee,
      accessToken,
      refreshToken,
    };
  }),
  forgotPassword: publicProcedure.input(emailAuthDto).mutation(async ({ ctx: { req, prisma }, input }) => {
    const employee = await prisma.employee.findUnique({
      where: {
        email: input.email,
      },
      select: {
        id: true,
      },
    });

    if (!employee) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
      });
    }

    const access_token = jwt.sign({ id: employee.id }, process.env.VERIFICATION_JWT_SECRET_KEY || '', {
      expiresIn: process.env.VERIFICATION_EXPIRES_IN,
    });

    await emailService.sendMessage(
      'forgot_password',
      {
        url: `${process.env.MANAGER_APP_URL}/forgot_password?token=${access_token}`,
      },
      {
        to: input.email,
        // TODO: lang
        subject: 'Восстановление пароля',
      },
    );

    return {
      status: ESuccessCode.OK,
    };
  }),
  resetPassword: publicProcedure.input(resetPasswordDro).mutation(async ({ ctx: { prisma }, input }) => {
    const payload = jwt.verify(input.token, process.env.VERIFICATION_JWT_SECRET_KEY || '') as jwt.JwtPayload | null;

    if (!payload) {
      logger.info(
        `Unable to verify reset password link for employee. Unable to extract payload. Token: **********${input.token.slice(
          -4
        )}`
      );
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    const hashedPassword = authService.hash(input.password);

    try {
      await prisma.employee.update({
        where: {
          id: payload.id,
        },
        data: {
          password: hashedPassword,
        },
      });
    } catch (e) {
      logger.warn(`Unable to reset password for employee. Error updating employee: ${e}`);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    return {
      status: ESuccessCode.OK,
    };
  }),
});
