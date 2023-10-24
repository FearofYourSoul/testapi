import { TRPCError } from '@trpc/server';
import dayjs from 'dayjs';

import { router } from '../../../../createRouter';
import { managerPrivateProcedure } from '../../../../../privateProcedures';
import { createDepositExceptionSettingsDto, createDepositSettingsDto, updateDepositSettingsDto } from './dto';
import { formatToWorkingHour } from '../../../../../utils';
import { getPlaceDto } from '../../dto';
import { logger } from '../../../../../log';

export const settingsDepositRouter = router({
  create: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(createDepositSettingsDto)
    .mutation(async ({ ctx: { prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.place_id,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!place) {
        logger.info(`Attempted to create deposit for non-existent place. place: ${input?.place_id}`);
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const deposit = await prisma.deposit.create({
        data: {
          ...input,
        },
        include: {
          Exceptions: true,
        },
      });

      return deposit;
    }),
  update: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(updateDepositSettingsDto)
    .mutation(async ({ ctx: { prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.place_id,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!place) {
        logger.info(`Attempted to update deposit for non-existent place. place: ${input?.place_id}`);
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const updatedDeposit = await prisma.deposit.update({
        where: {
          place_id: input.place_id,
        },
        data: {
          person_price: input.person_price,
          table_price: input.table_price,
          is_person_price: input.is_person_price,
          is_table_price: input.is_table_price,
          interaction: input.interaction,
          Exceptions: {
            deleteMany: {
              id: {
                in: input.deletedExceptions,
              },
            },
          },
        },
        include: {
          Exceptions: true,
        },
      });

      return updatedDeposit;
    }),
  createException: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(createDepositExceptionSettingsDto)
    .mutation(async ({ ctx: { prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.place_id,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!place) {
        logger.info(`Attempted to create deposit exception for non-existent place. place: ${input?.place_id}`);
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const startTime = input?.start_time ? dayjs(input.start_time) : undefined;
      const endTime = input?.end_time ? dayjs(input.end_time) : undefined;
      const data: Record<string, Date> = {};

      if (!input.is_all_day) {
        data.start_time = formatToWorkingHour({ timestamp: startTime });
        data.end_time = formatToWorkingHour({ timestamp: endTime, isNextDay: !endTime });
      }

      const updatedDeposit = await prisma.depositException.create({
        data: {
          ...data,
          Deposit: {
            connect: {
              place_id: input.place_id,
            },
          },
          person_price: input.person_price,
          table_price: input.table_price,
          is_person_price: input.is_person_price,
          is_table_price: input.is_table_price,
          is_all_day: input.is_all_day,
          start_date: input.start_date,
          end_date: input.end_date,
          days: input.days,
          for_days_of_week: input.for_days_of_week,
        },
      });

      return updatedDeposit;
    }),
  byPlaceId: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(getPlaceDto)
    .query(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!place) {
        logger.debug(`Attempted to get deposit for non-existent place. place: ${input?.placeId}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Place not found',
        });
      }

      const deposit = await prisma.deposit.findFirst({
        where: {
          place_id: place.id,
        },
        include: {
          Exceptions: true,
        },
      });

      if (!deposit) {
        logger.info(`Attempted to get deposit for non-existent place. place: ${input?.placeId}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deposit not found',
        });
      }

      return deposit;
    }),
});
