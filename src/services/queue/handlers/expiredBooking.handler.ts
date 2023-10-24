import { EBookingStatus } from '@prisma/client';
import { Job } from 'bullmq';
import dayjs from 'dayjs';

import { prisma } from '../../../utils/prisma';
import { WSService } from '../../websocket';
import { i18n } from '../../../utils';
import { expoPushService } from '../../expo.service';

export interface IExpiredOrderJob {
  bookingId: string;
}

export const expiredBookingHandler = async (job: Job<IExpiredOrderJob, any, string>) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: job.data.bookingId,
    },
    select: {
      status: true,
    },
  });

  if (booking && booking?.status === EBookingStatus.WAITING) {
    return await prisma.booking.update({
      where: {
        id: job.data.bookingId,
      },
      data: { status: EBookingStatus.EXPIRED },
    });
  }
};

export const handleCompletedExpiryBooking = async ({
  job,
  wsService,
}: {
  wsService: WSService;
  job: Job<IExpiredOrderJob>;
}) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: job.data.bookingId,
    },
    select: {
      booking_number: true,
      client_id: true,
      end_time: true,
      id: true,
      start_time: true,
      status: true,
      PlaceTable: {
        select: {
          id: true,
          name: true,
          PlaceSection: {
            select: {
              id: true,
              place_id: true,
              name: true,
            },
          },
        },
      },
      Payment: {
        select: {
          id: true,
          bepaid_uid: true,
          amount: true,
        },
      },
    },
  });

  if (!booking) {
    return;
  }

  const notification = await prisma.managerNotification.create({
    data: {
      BookingNotification: {
        create: {
          booking_id: booking.id,
          booking_status: booking.status,
          place_id: booking.PlaceTable.PlaceSection.place_id,
        },
      },
    },
    select: {
      id: true,
    },
  });

  const averageRating = await prisma.averageClientRating.findMany({
    where: {
      ClientRatingField: {
        place_id: booking.PlaceTable.PlaceSection.place_id,
      },
      client_id: booking.client_id,
    },
    select: {
      average_rating: true,
      id: true,
      rating_name: true,
      success_bookings: true,
    },
  });

  const clientReq = prisma.client.findUnique({
    where: { id: booking.client_id },
    select: {
      expo_token: true,
      language: true,
      push_notifications: true,
    },
  });
  const placeReq = prisma.place.findUnique({
    where: { id: booking.PlaceTable.PlaceSection.place_id },
    select: { id: true, name: true, bepaid_id: true, bepaid_secret_key: true },
  });
  const [client, place] = await prisma.$transaction([clientReq, placeReq]);

  if (place && client && client.push_notifications && client.expo_token) {
    const t = await i18n;
    const status = t(`statuses.REJECTED`, { ns: 'notifications', lng: client.language || 'ru' });
    const from = dayjs(booking.start_time).format('HH:mm');
    const to = dayjs(booking.end_time).format('HH:mm');
    const message = t('message', {
      ns: 'notifications',
      status,
      time: `${from === to ? from : `${from}-${to}`}`,
      name: place.name,
      lng: client.language || 'ru',
    });
    await expoPushService.sendNotification({
      pushToken: client.expo_token,
      data: {
        bookingId: booking.id,
        orderNumber: booking.booking_number,
        placeId: place.id,
      },
      title: 'Mesto',
      message,
    });
  }

  wsService.sendAcceptBooking({ ...booking, AverageClientRating: averageRating, notificationId: notification.id });
  wsService.customerService.sendChangedBookingStatus({
    id: booking.id,
    status: booking.status,
    clientId: booking.client_id,
  });
};
