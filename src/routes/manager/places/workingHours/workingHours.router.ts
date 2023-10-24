import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { router } from '../../../createRouter';
import { updateWorkingHours } from './dto';
import { managerPrivateProcedure } from '../../../../privateProcedures';

export const workingHoursRouter = router({
  update: managerPrivateProcedure({
    manager: true,
  })
    .input(updateWorkingHours)
    .mutation(async ({ ctx: { prisma, whereCondition }, input }) => {
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Place not found',
        });
      }

      const updatedPlace = await prisma.place.update({
        where: {
          id: place.id,
        },
        data: {
          WorkingHours: {
            update: input.workingHours.map<Prisma.WorkingHoursUpdateWithWhereUniqueWithoutPlaceInput>((dayOfWeek) => ({
              where: {
                day_place_id: {
                  day: dayOfWeek.day,
                  place_id: input.placeId,
                },
              },
              data: dayOfWeek,
            })),
          },
        },
        select: {
          WorkingHours: {
            select: {
              day: true,
              is_day_off: true,
              is_working_all_day: true,
              start_time: true,
              end_time: true,
            },
          },
        },
      });

      return updatedPlace.WorkingHours;
    }),
});
