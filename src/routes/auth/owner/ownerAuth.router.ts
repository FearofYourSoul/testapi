import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';

import { authService, emailService, EStrategy } from '../../../services';
import { ESuccessCode } from '../../../utils';
import { publicProcedure, router } from '../../createRouter';
import { emailAuthDto, ownerSignUpDto, resetPasswordDro, tokenDto } from '../dto';
import { logger } from '../../../log';

export const ownerAuthRouter = router({
  register: publicProcedure.input(ownerSignUpDto).mutation(async ({ ctx: { prisma }, input }) => {
    // TODO add phone number verification
    const existingOwner = await prisma.owner.findFirst({
      where: { OR: [{ phone_number: input.phoneNumber }, { email: input.email }] },
    });

    if (existingOwner) {
      logger.info(
        `attempted to register owner with existing phone number (${input.phoneNumber}) or email (${input.email})`
      );
      throw new TRPCError({
        code: 'CONFLICT',
      });
    }

    const hashedPassword = authService.hash(input.password);

    const owner = await prisma.owner.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        phone_number: input.phoneNumber,
      },
      select: {
        id: true,
        email: true,
        is_email_verified: true,
      },
    });

    const access_token = jwt.sign({ id: owner.id }, process.env.VERIFICATION_JWT_SECRET_KEY || '', {
      expiresIn: process.env.VERIFICATION_EXPIRES_IN,
    });

    await emailService.sendMessage(
      'email_verification',
      { url: `${process.env.MANAGER_APP_URL}/owner/verification?token=${access_token}` },
      {
        to: input.email,
        // TODO: lang
        subject: 'Проверка почты',
      }
    );

    return {
      owner,
    };
  }),
  sendVerification: publicProcedure.input(emailAuthDto).mutation(async ({ ctx: { prisma }, input }) => {
    const existingOwner = await prisma.owner.findFirst({
      where: { email: input.email },
    });

    if (!existingOwner) {
      logger.warn(`attempted to send verification for owner that doesn't exist. Email: ${input.email}`);
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Owner with such email not found',
      });
    }

    const access_token = jwt.sign({ id: existingOwner.id }, process.env.VERIFICATION_JWT_SECRET_KEY || '', {
      expiresIn: process.env.VERIFICATION_EXPIRES_IN,
    });

    await emailService.sendMessage(
      'email_verification',
      { url: `${process.env.MANAGER_APP_URL}/verification/owner?token=${access_token}` },
      {
        to: input.email,
        // TODO: lang
        subject: 'Проверка почты',
      }
    );
  }),
  verify: publicProcedure.input(tokenDto).mutation(async ({ ctx: { req, res, prisma }, input }) => {
    const payload = jwt.verify(input.token, process.env.VERIFICATION_JWT_SECRET_KEY || '') as jwt.JwtPayload | null;

    if (!payload) {
      logger.warn(`Unable to verify owner. Unable to extract payload. Token: **********${input.token.slice(-4)}`);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    let owner;

    try {
      owner = await prisma.owner.update({
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
      logger.warn(`Unable to verify owner. Error updating owner: ${e}`);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    const { accessToken, refreshToken, refreshExpiresIn } = authService.generateTokens(
      { id: owner.id },
      { type: EStrategy.OWNER }
    );

    await prisma.refreshToken.upsert({
      where: {
        user_agent_owner_id: {
          // ip: req.ip,
          user_agent: req.headers['user-agent'] || '',
          owner_id: owner.id,
        },
      },
      update: {
        token: authService.hash(refreshToken.split('.')[2]),
      },
      create: {
        // ip: req.ip,
        user_agent: req.headers['user-agent'] || '',
        token: authService.hash(refreshToken.split('.')[2]),
        owner_id: owner.id,
      },
    });

    // TODO:
    // res.cookie('refreshToken', refreshToken, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'none',
    //   expires: dayjs()
    //     .add(Number(refreshExpiresIn!.split('')[0]), (refreshExpiresIn!.split('')[1] || 'd') as ManipulateType)
    //     .toDate(),
    // });

    return {
      owner,
      accessToken,
      refreshToken,
      // expiresIn,
    };
  }),
  forgotPassword: publicProcedure.input(emailAuthDto).mutation(async ({ ctx: { prisma }, input }) => {
    const owner = await prisma.owner.findUnique({
      where: {
        email: input.email,
      },
      select: {
        id: true,
      },
    });

    if (!owner) {
      logger.warn(`attempted to send password recovery for owner that doesn't exist. Email: ${input.email}`);
      throw new TRPCError({
        code: 'NOT_FOUND',
      });
    }

    const access_token = jwt.sign({ id: owner.id }, process.env.VERIFICATION_JWT_SECRET_KEY || '', {
      expiresIn: process.env.VERIFICATION_EXPIRES_IN,
    });

    await emailService.sendMessage(
      'forgot_password',
      { url: `${process.env.MANAGER_APP_URL}/forgot_password?token=${access_token}` },
      {
        to: input.email,
        // TODO: lang
        subject: 'Восстановление пароля',
      }
    );

    return {
      status: ESuccessCode.OK,
    };
  }),
  resetPassword: publicProcedure.input(resetPasswordDro).mutation(async ({ ctx: { prisma }, input }) => {
    const payload = jwt.verify(input.token, process.env.VERIFICATION_JWT_SECRET_KEY || '') as jwt.JwtPayload | null;

    if (!payload) {
      logger.warn(
        `Unable to verify reset password link for owner. Unable to extract payload. Token: **********${input.token.slice(
          -4
        )}`
      );
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    const hashedPassword = authService.hash(input.password);

    let owner;

    try {
      owner = await prisma.owner.update({
        where: {
          id: payload.id,
        },
        data: {
          password: hashedPassword,
        },
      });
    } catch (e) {
      logger.warn(`Unable to reset password for owner. Error updating owner: ${e}`);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    return {
      status: ESuccessCode.OK,
    };
  }),
});
