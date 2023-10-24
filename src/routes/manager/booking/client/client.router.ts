import { TRPCError } from '@trpc/server';

import { managerPrivateProcedure } from '../../../../privateProcedures';
import { router } from '../../../createRouter';
import { leaveReviewDto, preorderListDto } from './dto';
import { phoneAuthDto } from '../../../auth/dto';
import { logger } from '../../../../log';

export const clientRouter = router({
  leaveReview: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(leaveReviewDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const booking = await prisma.booking.findFirst({
        where: {
          id: input.bookingId,
          PlaceTable: whereCondition.PlaceTable,
        },
        select: {
          client_id: true,
          PlaceTable: {
            select: {
              PlaceSection: {
                select: {
                  place_id: true,
                },
              },
            },
          },
        },
      });

      if (!booking) {
        logger.warn(
          `Attempted to leave review for booking that doesn't exist. booking ${input.bookingId} user: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Booking not found',
        });
      }

      const placeFields = await prisma.clientRatingField.findMany({
        where: {
          name: {
            in: input.fields.map(({ name }) => name),
          },
          place_id: booking.PlaceTable.PlaceSection.place_id,
        },
      });

      const createFields = placeFields.map(({ id, name }, i) => {
        return prisma.clientRating.create({
          data: {
            rating_field_id: id,
            booking_id: input.bookingId,
            comment: i === 0 ? input.comment : undefined,
            rating: input.fields.find((value) => name === value.name)?.rating,
          },
          select: {
            ClientRatingField: {
              select: {
                name: true,
              },
            },
            id: true,
            comment: true,
            rating: true,
          },
        });
      });

      const averageRating = await prisma.averageClientRating.findMany({
        where: {
          client_id: booking.client_id,
          ClientRatingField: {
            place_id: booking.PlaceTable.PlaceSection.place_id,
          },
        },
      });

      const clientRating = await prisma.$transaction(createFields);

      if (!averageRating.length) {
        const createAverageRating = placeFields.map(({ id, name }) => {
          const rate = input.fields.find((value) => name === value.name)?.rating;

          return prisma.averageClientRating.create({
            data: {
              average_rating: rate || 0,
              rating_name: name,
              client_id: booking.client_id,
              success_bookings: 1,
              rating_field_id: id,
            },
          });
        });

        const createdAverageRating = await prisma.$transaction(createAverageRating);

        return {
          averageClientRating: createdAverageRating,
          clientRating,
          clientId: booking.client_id,
          placeId: booking.PlaceTable.PlaceSection.place_id,
        };
      }

      const updateAverageRating = averageRating.map(({ average_rating, id, rating_name, success_bookings }) => {
        const rate = input.fields.find((value) => rating_name === value.name)?.rating;

        return prisma.averageClientRating.update({
          where: {
            id,
          },
          data: {
            average_rating: rate ? (rate + average_rating) / 2 : undefined,
            success_bookings: success_bookings + 1,
          },
        });
      });

      const updatedAverageRating = await prisma.$transaction(updateAverageRating);

      return {
        averageClientRating: updatedAverageRating,
        clientRating,
        clientId: booking.client_id,
        placeId: booking.PlaceTable.PlaceSection.place_id,
      };
    }),
  byPhoneNumber: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(phoneAuthDto)
    .query(async ({ ctx: { prisma, whereCondition }, input }) => {
      const client = await prisma.client.findFirst({
        where: {
          phone_number: input.phone_number,
          VisitedPlace: {
            some: {
              Place: whereCondition.PlaceTable.PlaceSection.Place,
            },
          },
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          AverageClientRating: {
            select: {
              average_rating: true,
              id: true,
              rating_name: true,
              success_bookings: true,
            },
          },
        },
      });

      return client;
    }),
  preorderList: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(preorderListDto)
    .query(async ({ ctx: { prisma }, input }) => {
      const preorderList = await prisma.preOrderMenuItem.findMany({
        where: {
          bookingId: input.bookingId,
        },
        select: {
          id: true,
          count: true,
          PlaceMenuItem: {
            include: {
              Image: {
                select: {
                  id: true,
                  medium: true,
                },
              },
            },
          },
        },
      });

      return preorderList;
    }),
});
