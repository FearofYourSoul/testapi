import { EDepositInteraction, Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import dayjs from 'dayjs';

import { router } from '../../createRouter';
import { getPlaceDeposit, getVisitedDto } from './dto';
import { clientPrivateProcedure } from '../../../privateProcedures';
import { favoriteRoute } from './favorite';
import { formatToWorkingHour } from '../../../utils';
import { logger } from '../../../log';

export const placeRouter = router({
  placeDeposit: clientPrivateProcedure.input(getPlaceDeposit).query(async ({ ctx: { req, prisma }, input }) => {
    const startTime = dayjs(input.timeStart);
    const endTime = dayjs(input.timeEnd);
    const formattedStartTime = formatToWorkingHour({ timestamp: startTime });
    const formattedEndTime = formatToWorkingHour({ timestamp: endTime });

    const place = await prisma.place.findFirst({
      where: { id: input.placeId },
      select: {
        Deposit: {
          include: {
            Exceptions: {
              where: {
                OR: [
                  {
                    for_days_of_week: false,
                    start_date: {
                      lte: startTime.toDate(),
                    },
                    end_date: {
                      gt: endTime.toDate(),
                    },
                    is_all_day: true,
                  },
                  {
                    for_days_of_week: false,
                    start_date: {
                      lte: startTime.toDate(),
                    },
                    end_date: {
                      gt: endTime.toDate(),
                    },
                    start_time: {
                      lte: formattedStartTime.toISOString(),
                    },
                    end_time: {
                      gt: formattedEndTime.toISOString(),
                    },
                    is_all_day: false,
                  },
                  {
                    for_days_of_week: true,
                    days: {
                      contains: startTime.day().toString(),
                    },
                    is_all_day: true,
                  },
                  {
                    for_days_of_week: true,
                    days: {
                      contains: startTime.day().toString(),
                    },
                    is_all_day: false,
                    start_time: {
                      lte: formattedStartTime.toISOString(),
                    },
                    end_time: {
                      gt: formattedEndTime.toISOString(),
                    },
                  },
                ],
              },
              orderBy: {
                created_at: 'desc',
              },
            },
          },
        },
      },
    });

    if (!place) {
      logger.warn(
        `Attempted to get deposit for place that doesn't exist. place ${input.placeId} user: ${req.user.phone_number}`
      );
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Place not found' });
    }

    let depositTotalAmount = 0;

    if (place.Deposit?.id) {
      let personPrice = 0;
      let tablePrice = 0;

      if (place.Deposit.Exceptions.length) {
        const exception = place.Deposit.Exceptions[0];

        personPrice = (exception.is_person_price && (exception.person_price || 0) * input.numberPersons) || 0;
        tablePrice = (exception.is_table_price && exception.table_price) || 0;
      } else {
        personPrice = (place.Deposit.is_person_price && (place.Deposit.person_price || 0) * input.numberPersons) || 0;
        tablePrice = (place.Deposit.is_table_price && place.Deposit.table_price) || 0;
      }

      if (place.Deposit.interaction === EDepositInteraction.TAKE_MORE) {
        depositTotalAmount = Math.max(personPrice, tablePrice);
      } else {
        depositTotalAmount = personPrice + tablePrice;
      }
    }

    return {
      depositTotalAmount,
    };
  }),
  visited: clientPrivateProcedure.input(getVisitedDto).query(async ({ ctx: { req, prisma }, input }) => {
    const userId = req.user.id;

    const whereInput: Prisma.PlaceWhereInput = {
      VisitedPlace: {
        some: {
          client_id: userId,
        },
      },
    };
    const totalCount = await prisma.place.count({
      where: whereInput,
    });
    const places = await prisma.place.findMany({
      where: whereInput,
      take: input.limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      select: {
        id: true,
        BaseImage: {
          select: {
            id: true,
            small: true,
            medium: true,
            large: true,
            base: true,
          },
        },
        name: true,
        CategoryPlace: {
          select: {
            Category: {
              select: {
                name: true,
              },
            },
          },
        },
        PlaceKitchen: {
          select: {
            Kitchen: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    let nextCursor: typeof input.cursor | undefined;
    if (places.length > input.limit) {
      const nextItem = places.pop();
      nextCursor = nextItem!.id;
    }

    return { totalCount, places, nextCursor };
  }),
  favorite: favoriteRoute,
});
