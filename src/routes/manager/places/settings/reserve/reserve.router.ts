import { TRPCError } from '@trpc/server';

import { router } from '../../../../createRouter';
import { updateReservesSettingsDto, getReservesSettingsDto } from './dto';
import { managerPrivateProcedure } from '../../../../../privateProcedures';
import { logger } from '../../../../../log';

export const settingsReserveRouter = router({
  list: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(getReservesSettingsDto)
    .query(async ({ ctx: { prisma, whereCondition, req }, input }) => {
      const reserves = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          ReservesSettings: true,
        },
      });

      if (!reserves) {
        logger.info(
          `Attempted to get reserve settings info for non-existent place. place: ${input?.placeId}, manager ${req.user.id}`
        );
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return reserves.ReservesSettings;
    }),
  update: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(updateReservesSettingsDto)
    .mutation(async ({ ctx: { prisma, whereCondition, req }, input }) => {
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
        logger.info(
          `Attempted to update reserve settings info for non-existent place. place: ${input?.placeId}, manager: ${req.user.id}`
        );
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const updatedPlace = await prisma.place.update({
        where: {
          id: input.placeId,
        },
        data: {
          ReservesSettings: {
            update: {
              delayed_response_time: input.delayedResponseTime,
              max_booking_time: input.maxBookingTime,
              min_booking_time: input.minBookingTime,
              response_time: input.responseTime,
              time_between_reserves: input.timeBetweenReserves,
              unreachable_interval: input.unreachableInterval,
            },
          },
        },
        select: {
          ReservesSettings: true,
        },
      });

      return updatedPlace;
    }),
});
