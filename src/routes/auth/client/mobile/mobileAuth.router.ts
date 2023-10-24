import { TRPCError } from '@trpc/server';
import phone from 'phone';

import { authService, EAppId, EStrategy, smsService } from '../../../../services';
import { EErrorCode, ESuccessCode } from '../../../../utils';
import { router } from '../../../createRouter';
import { mobileAuthDto, phoneAuthDto } from '../../dto';
import { mobileAuthProcedure } from './mobile.procedure';
import { clientPrivateProcedure } from '../../../../privateProcedures';
import { logger } from '../../../../log';

export const mobileAuthRouter = router({
  getCode: mobileAuthProcedure.input(phoneAuthDto).mutation(async ({ ctx: { prisma }, input }) => {
    const serviceResults = await smsService.sendVerificationCode({ phoneNumber: input.phone_number });

    if (!serviceResults) {
      logger.warn(`SMS service error. Unable to send verification code, phone number: ${input.phone_number}`);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: EErrorCode.INVALID,
      });
    }

    return {
      status: ESuccessCode.OK,
    };
  }),
  login: mobileAuthProcedure.input(mobileAuthDto).mutation(async ({ ctx: { prisma }, input }) => {
    const phone_number = phone(input.phone_number).phoneNumber;

    if (!phone_number) {
      logger.warn(`Phone validation error. Unable to login, phone number: ${input.phone_number}`);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: EErrorCode.INVALID,
      });
    }

    const client = await prisma.client.findUnique({
      where: {
        phone_number,
      },
      select: {
        id: true,
        phone_number: true,
        verification_code: true,
        first_name: true,
      },
    });

    if (!client) {
      logger.info(`Unable to login, cannot find client with phone number: ${input.phone_number}`);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: EErrorCode.INVALID,
      });
    }

    if (!authService.compare({ str: input.code, hash: client.verification_code! })) {
      if (process.env.NODE_ENV !== 'development') {
        logger.info(
          `Unable to login client with phone number: ${input.phone_number}. Code comparison failed. Input: ${input.code}, server: ${client.verification_code}`
        );
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: EErrorCode.INVALID,
        });
      }
    }

    await prisma.client.update({
      where: { id: client.id },
      data: {
        language: input.language,
      },
    });
  
    const access_token = authService.generateAccessToken({ id: client.id }, { type: EStrategy.CLIENT });

    return { access_token, clientName: client.first_name };
  }),
  ws: clientPrivateProcedure.mutation(async ({ ctx: { req } }) => {
    const token = authService.generateAccessToken(
      {
        id: req.user.id,
      },
      { type: EStrategy.CLIENT_WS, appId: EAppId.CLIENT_MOBILE }
    );

    return {
      token,
    };
  }),
});
