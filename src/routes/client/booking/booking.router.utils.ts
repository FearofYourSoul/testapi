import { TRPCError } from '@trpc/server';
import dayjs from 'dayjs';
import {
  DepositPayment,
  EBookingStatus,
  EDepositInteraction,
  ETransactionStatus,
  PreOrderPayment,
  Prisma,
  PrismaClient,
} from '@prisma/client';

import { TBookTableDto } from './dto';
import { formatToWorkingHour } from '../../../utils';
import { WSService } from '../../../services';
import { TRouterOutput } from '../../app.router';

interface IPayProps {
  input: TBookTableDto;
  placeId: string;
  prisma: PrismaClient<
    Prisma.PrismaClientOptions,
    never,
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >;
  clientId: string;
}

interface ISendNotificationProps {
  ioService: WSService;
  prisma: PrismaClient<
    Prisma.PrismaClientOptions,
    never,
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >;
  booking: Omit<TRouterOutput['clients']['booking']['book']['booking'], 'end_time' | 'start_time' | 'created_at' | 'Payment'> &
    Record<'end_time' | 'start_time' | 'created_at', Date | string>;
}

export const calculatePayments = async ({ input, prisma, clientId, placeId }: IPayProps) => {
  const startTime = dayjs(input.timeStart);
  const endTime = dayjs(input.timeEnd);
  const formattedStartTime = formatToWorkingHour({ timestamp: startTime });
  const formattedEndTime = formatToWorkingHour({ timestamp: endTime });

  const place = await prisma.place.findFirst({
    where: { id: placeId },
    select: {
      PlaceMenuItems: {
        where: {
          id: {
            in: input.menuItems?.map(({ id }) => id),
          },
        },
      },
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
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Place not found' });
  }

  let depositTotalAmount = 0;
  let preOrderTotalAmount = 0;
  let preorderPayment:
    | (PreOrderPayment & {
        PreOrderMenuItem: {
          id: string;
        }[];
      })
    | undefined;
  let depositPayment: DepositPayment | undefined;

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

  if (place.PlaceMenuItems.length) {
    preOrderTotalAmount = place.PlaceMenuItems.reduce<number>((sum, { id: menuId, price }) => {
      const count = input.menuItems?.find(({ id }) => id === menuId)?.count || 0;
      return sum + price * count;
    }, 0);
  }

  if (preOrderTotalAmount) {
    preorderPayment = await prisma.preOrderPayment.create({
      data: {
        amount: preOrderTotalAmount,
        client_id: clientId,
        fee: 0,
        PreOrderMenuItem: input.menuItems
          ? { create: input.menuItems.map(({ count, id }) => ({ count, place_menu_item_id: id })) }
          : undefined,
      },
      include: {
        PreOrderMenuItem: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  if (depositTotalAmount && depositTotalAmount - preOrderTotalAmount > 0) {
    depositPayment = await prisma.depositPayment.create({
      data: {
        Client: {
          connect: {
            id: clientId,
          },
        },
        amount: depositTotalAmount,
        fee: 0,
      },
    });
  }

  return {
    totalAmount: depositTotalAmount > preOrderTotalAmount ? depositTotalAmount : preOrderTotalAmount,
    depositPayment,
    preorderPayment,
  };
};

export const sendNotificationToManager = async ({ booking, ioService, prisma }: ISendNotificationProps) => {
  const averageRating = await prisma.averageClientRating.findMany({
    where: {
      ClientRatingField: {
        place_id: booking.PlaceTable.PlaceSection.place_id,
      },
      client_id: booking.Client.id,
    },
    select: {
      average_rating: true,
      id: true,
      rating_name: true,
      success_bookings: true,
    },
  });

  const bookingNotifications = await prisma.bookingNotification.create({
    data: {
      booking_id: booking.id,
      booking_status: booking.status,
      place_id: booking.PlaceTable.PlaceSection.place_id,
    },
    select: { id: true },
  });

  const notification = await prisma.managerNotification.create({
    data: {
      client_id: booking.Client.id,
      booking_notification_id: bookingNotifications.id,
    },
  });

  await ioService.hostessService.sendBookedTable({
    ...booking,
    manager_comment: null,
    Client: {
      ...booking.Client,
      AverageClientRating: averageRating,
    },
    notificationId: notification.id,
  });
};
