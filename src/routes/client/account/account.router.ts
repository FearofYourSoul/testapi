import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';

import { router, TRequest } from '../../createRouter';
import { updateClientDto, updateFCMTokenDto, updateLocationDto, updatePhoneNumber } from './dto';

import { authService, emailService, smsService } from '../../../services';
import { EErrorCode } from '../../../utils';
import { clientPrivateProcedure } from '../../../privateProcedures';
import { logger } from '../../../log';

export const accountRouter = router({
  update: clientPrivateProcedure.input(updateClientDto).mutation(async ({ ctx: { prisma, req }, input }) => {
    if (input.phoneNumber && req.user.phone_number !== input.phoneNumber) {
      const user = await prisma.client.findUnique({
        where: {
          phone_number: input.phoneNumber || '',
        },
      });

      if (user) {
        logger.info(`Unable to update user. Phone number changed, but it already exist: ${input.phoneNumber}`);
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with such phone number already exist',
        });
      }
      smsService.sendVerificationCode({ phoneNumber: input.phoneNumber, clientId: req.user.id });
    }

    const updatedUser = await prisma.client.update({
      where: {
        id: req.user.id,
      },
      data: {
        first_name: input.name !== req.user.first_name ? input.name : undefined,
        has_email_notifications: input.emailNotifications,
        push_notifications: input.pushNotifications,
      },
    });

    if (input.email && input.email !== req.user.email) {
      const access_token = jwt.sign({ id: req.user.id }, process.env.VERIFICATION_JWT_SECRET_KEY || '', {
        expiresIn: process.env.VERIFICATION_EXPIRES_IN,
      });
      const isExist = await prisma.client.findUnique({
        where: {
          email: input.email || '',
        },
      });
      if (isExist) {
        logger.info(`Unable to update user. Email changed but it already taken: ${input.email}`);
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with such email already exist',
        });
      }
      const url = `${req.protocol}://${req.headers.host}/api/client/email-verification?token=${access_token}`;
      const user = await prisma.client.update({
        where: {
          id: req.user.id,
        },
        data: {
          email: input.email !== req.user.email ? input.email : undefined,
          is_email_verified: false,
          has_email_notifications: false,
        },
      });
      Object.assign(updatedUser, user);
      try {
        await emailService.sendMessage(
          'email_verification',
          { url },
          {
            to: input.email,
            subject: 'Проверка почты',
          },
          { t: req.t },
        );
      } catch (error) {
        logger.error(
          `Failed to send email verification for user: ${req.user.phone_number}. Email: ${input.email}. Error: ${error}`
        );
      }
    }

    return updatedUser;
  }),
  delete: clientPrivateProcedure.mutation(async ({ ctx: { req, prisma } }) => {
    await prisma.booking.deleteMany({
      where: {
        client_id: req.user.id,
      },
    });

    await prisma.averageClientRating.deleteMany({
      where: {
        client_id: req.user.id,
      },
    });

    await prisma.visitedPlace.deleteMany({
      where: {
        client_id: req.user.id,
      },
    });

    await prisma.client.delete({
      where: {
        id: req.user.id,
      },
    });
  }),
  updatePhoneNumber: clientPrivateProcedure
    .input(updatePhoneNumber)
    .mutation(async ({ ctx: { req, prisma }, input }) => {
      if (!req.user.verification_code || !authService.compare({ str: input.code, hash: req.user.verification_code })) {
        if (process.env.NODE_ENV !== 'development') {
          logger.info(
            `Unable to update user phone number. MFA failed. input code: ${input.code}, server code: ${req.user.verification_code}`
          );
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: EErrorCode.INVALID,
          });
        }
      }

      const data = await prisma.client.update({
        where: {
          id: req.user.id,
        },
        data: {
          phone_number: input.phoneNumber,
        },
        select: {
          id: true,
          phone_number: true,
        },
      });

      return data;
    }),
  updateLocation: clientPrivateProcedure.input(updateLocationDto).mutation(async ({ ctx: { req, prisma }, input }) => {
    const address = await prisma.address.create({
      data: {
        country_code: input.countryCode,
        address_line1: input.addressLine1,
        address_line2: input.addressLine2,
        postal_code: input.postalCode,
        latitude: input.latitude,
        longitude: input.longitude,
        city: input.city,
      },
    });

    const data = await prisma.client.update({
      where: {
        id: req.user.id,
      },
      data: {
        CurrentLocation: {
          connect: {
            id: address.id,
          },
        },
      },
      select: {
        id: true,
        CurrentLocation: true,
      },
    });

    return data;
  }),
  updateExpoPushToken: clientPrivateProcedure.input(updateFCMTokenDto).mutation(async ({ ctx: { req, prisma }, input }) => {
    const data = await prisma.client.update({
      where: {
        id: req.user.id,
      },
      data: {
        expo_token: input.expoToken,
        expo_token_updated_at: new Date(),
      },
    });

    return data;
  }),
});
