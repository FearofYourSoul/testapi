import { RequestHandler } from 'express';
import { ETransactionStatus } from '@prisma/client';

import { prisma } from '../utils';
import { sendNotificationToManager } from '../routes/client/booking/booking.router.utils';
import { WSService, bullMqService, expoPushService } from '../services';
import { logger } from '../log';
import dayjs from 'dayjs';

interface IBody {
  transaction: {
    shop_id: string;
    token: string;
    uid: string;
    status: ETransactionStatus;
    order: {
      tracking_id: string;
    };
  };
}

export const handleBepaidWebhook =
  (ioService: WSService): RequestHandler<any, any, IBody | IBody['transaction'] | undefined> =>
  async (req, res) => {
    const body = req.body && 'transaction' in req.body ? req.body?.transaction : req.body;
    const status = body?.status;
    const uid = body?.uid;
    const bookingId = req.query.bookingId as string;
    const currentTime = dayjs();
    const currentBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId || '',
      },
      select: {
        created_at: true,
      },
    });

    const isBefore = currentBooking && currentTime.isBefore(dayjs(currentBooking.created_at));
    const booking = await prisma.booking.update({
      where: {
        id: bookingId || '',
      },
      data: {
        status: status === ETransactionStatus.successful ? 'WAITING' : 'REJECTED',
        payment_status: status,
        created_at: isBefore ? undefined : currentTime.toDate(),
        Payment: {
          update: {
            status: status,
            bepaid_uid: uid,
          },
        },
      },
      select: {
        id: true,
        Client: {
          select: {
            email: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            expo_token: true,
            language: true,
            push_notifications: true,
            id: true,
          },
        },
        end_time: true,
        start_time: true,
        number_persons: true,
        booking_number: true,
        comment: true,
        status: true,
        created_at: true,
        Payment: {
          select: { id: true, status: true },
        },
        PlaceTable: {
          select: {
            id: true,
            name: true,
            PlaceSection: {
              select: {
                id: true,
                name: true,
                place_id: true,
                Place: {
                  select: {
                    id: true,
                    name: true,
                    ClientRating: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    ReservesSettings: {
                      select: {
                        response_time: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        DepositPayment: {
          select: {
            id: true,
            amount: true,
          },
        },
        PreOrderPayment: {
          select: {
            id: true,
            amount: true,
          },
        },
      },
    });

    if (status === ETransactionStatus.successful) {
      await sendNotificationToManager({ booking, ioService, prisma });

      const expiredAt = dayjs(isBefore ? currentBooking.created_at : currentTime)
        .add(booking.PlaceTable.PlaceSection.Place.ReservesSettings.response_time, 'seconds')
        .toISOString();
      await bullMqService.addBookingExpiryJob({ bookingId: booking.id, expiredAt });
    } else {
      if (booking.Client.expo_token && booking.Client.push_notifications) {
        const message = req.t('bepaid.paymentMessages.unsuccess', {
          ns: 'bookings',
          lng: booking.Client.language || 'ru',
        });
        await expoPushService.sendNotification({
          pushToken: booking.Client.expo_token,
          title: 'Mesto',
          message,
        });
      }
    }

    ioService.customerService.sendChangedBookingStatus({
      clientId: booking.Client.id,
      id: booking.id,
      status: booking.status,
      payment: booking.Payment ? { paymentId: booking.Payment.id, status: booking.Payment.status } : undefined,
    });

    res.json({ success: true });
  };
