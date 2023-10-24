import { TRPCError } from '@trpc/server';
import dayjs from 'dayjs';
import { EBookingStatus, ETransactionStatus } from '@prisma/client';

import {
  ICommonTransactionResponse,
  IGetCheckoutTokenResults,
  bepaidService,
  bookingService,
  bullMqService,
} from '../../../services';
import { router } from '../../createRouter';
import { bookTableDto, getBookingDto, getBookingsListDto } from './dto';
import { sortWorkingHours, formatToWorkingHour } from '../../../utils';
import { clientPrivateProcedure } from '../../../privateProcedures';
import { publicBookingService } from '../../public/place/table/booking/publicBooking.service';
import { getBookingsTable, getBookingsTables } from '../../public/place/table/booking/dto';
import { logger } from '../../../log';
import { calculatePayments, sendNotificationToManager } from './booking.router.utils';

export const bookingRouter = router({
  list: clientPrivateProcedure.input(getBookingsListDto).query(async ({ ctx: { req, prisma }, input }) => {
    const currentClientTime = dayjs(req.headers['client-timestamp']?.toString()).toDate();
    const where = {
      client_id: req.user.id,
      end_time: input?.isNeedActive
        ? {
            gte: currentClientTime,
          }
        : {
            lte: currentClientTime,
          },
    };

    const totalCount = await prisma.booking.count({ where });

    const orders = await prisma.booking.findMany({
      where,
      take: input.limit + 1,
      cursor: input?.cursor ? { id: input?.cursor } : undefined,
      select: {
        id: true,
        end_time: true,
        start_time: true,
        booking_number: true,
        status: true,
        number_persons: true,
        created_at: true,
        Payment: {
          select: { status: true, checkout_token: true, created_at: true },
        },
        PlaceTable: {
          select: {
            id: true,
            name: true,
            PlaceSection: {
              select: {
                id: true,
                name: true,
                Place: {
                  select: {
                    id: true,
                    name: true,
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
      orderBy: {
        created_at: 'desc',
      },
    });

    const cursor = input?.cursor;
    let nextCursor: typeof cursor;
    if (orders.length > (input?.limit || 10)) {
      const nextItem = orders.pop();
      nextCursor = nextItem!.id;
    }

    return {
      orders,
      totalCount,
      nextCursor,
    };
  }),
  byId: clientPrivateProcedure.input(getBookingDto).query(async ({ ctx: { req, prisma }, input }) => {
    const bookingTable = await prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        client_id: req.user.id,
      },
      select: {
        id: true,
        end_time: true,
        start_time: true,
        booking_number: true,
        status: true,
        number_persons: true,
        comment: true,
        created_at: true,
        Payment: {
          select: { status: true, checkout_token: true, created_at: true },
        },
        PlaceTable: {
          select: {
            id: true,
            name: true,
            PlaceSection: {
              select: {
                id: true,
                name: true,
                Place: {
                  select: {
                    id: true,
                    name: true,
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
        PreOrderMenuItem: {
          include: {
            PlaceMenuItem: {
              include: {
                Image: true,
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

    if (!bookingTable) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    return bookingTable;
  }),
  cancelBooking: clientPrivateProcedure
    .input(getBookingDto)
    .mutation(async ({ ctx: { req, prisma, ioService }, input }) => {
      const updatedBooking = await prisma.booking.update({
        where: {
          id: input.bookingId,
        },
        data: {
          status: EBookingStatus.CANCELED,
        },
        select: {
          id: true,
          status: true,
          start_time: true,
          end_time: true,
          booking_number: true,
          PlaceTable: {
            select: {
              PlaceSection: {
                select: {
                  place_id: true,
                  Place: {
                    select: {
                      bepaid_id: true,
                      bepaid_secret_key: true,
                    },
                  },
                },
              },
            },
          },
          Payment: {
            select: {
              id: true,
              bepaid_uid: true,
              bepaid_captures_id: true,
              amount: true,
              status: true,
            },
          },
        },
      });

      if (
        updatedBooking.Payment &&
        updatedBooking.PlaceTable.PlaceSection.Place.bepaid_id &&
        updatedBooking.PlaceTable.PlaceSection.Place.bepaid_secret_key
      ) {
        let canceledData: ICommonTransactionResponse['transaction'] | undefined;

        if (updatedBooking.Payment.bepaid_captures_id) {
          canceledData = await bepaidService.refund({
            amount: updatedBooking.Payment.amount,
            uid: updatedBooking.Payment.bepaid_captures_id,
            bePaidId: updatedBooking.PlaceTable.PlaceSection.Place.bepaid_id,
            secretKey: updatedBooking.PlaceTable.PlaceSection.Place.bepaid_secret_key,
          });
        }

        if (updatedBooking.Payment.bepaid_uid && !updatedBooking.Payment.bepaid_captures_id) {
          canceledData = await bepaidService.cancelAuthorization({
            amount: updatedBooking.Payment.amount,
            uid: updatedBooking.Payment.bepaid_uid,
            bePaidId: updatedBooking.PlaceTable.PlaceSection.Place.bepaid_id,
            secretKey: updatedBooking.PlaceTable.PlaceSection.Place.bepaid_secret_key,
          });
        }

        const payment = await prisma.payment.update({
          where: {
            id: updatedBooking.Payment.id,
          },
          data: {
            canceled_at: new Date(),
            status: 'canceled',
            Booking: {
              update: {
                RefundTransaction: updatedBooking.Payment.bepaid_captures_id
                  ? {
                      create: {
                        amount: updatedBooking.Payment.amount,
                        status: canceledData?.status || 'canceled',
                        bepaid_uid: canceledData?.uid,
                      },
                    }
                  : undefined,
                payment_status: 'canceled',
              },
            },
          },
          select: {
            status: true,
          },
        });

        updatedBooking.Payment.status = payment.status;
        // clear
        updatedBooking.Payment.bepaid_captures_id = null;
        updatedBooking.Payment.bepaid_uid = null;
      }

      const bookingNotifications = await prisma.bookingNotification.create({
        data: {
          booking_id: updatedBooking.id,
          booking_status: updatedBooking.status,
          place_id: updatedBooking.PlaceTable.PlaceSection.place_id,
        },
        select: { id: true },
      });

      const notification = await prisma.managerNotification.create({
        data: {
          client_id: req.user.id,
          booking_notification_id: bookingNotifications.id,
        },
      });

      ioService.customerService.sendCanceledBooking({
        bookingNumber: updatedBooking.booking_number,
        clientId: req.user.id,
        clientName: req.user.first_name,
        endTime: updatedBooking.end_time,
        id: updatedBooking.id,
        placeId: updatedBooking.PlaceTable.PlaceSection.place_id,
        startTime: updatedBooking.start_time,
        status: updatedBooking.status,
        notificationId: notification.id,
      });

      return updatedBooking;
    }),
  mixed: clientPrivateProcedure.input(getBookingsTables).query(async ({ ctx: { req }, input }) => {
    const data = await publicBookingService.getSectionBookings({ ...input, clientId: req.user.id });
    if (!data) {
      logger.warn(
        `Attempted to receive bookings for section that doesn't exist. section: ${input.sectionId}, user: ${req.user.phone_number}`
      );
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid sectionId',
      });
    }
    return data;
  }),
  mixedById: clientPrivateProcedure.input(getBookingsTable).query(async ({ ctx: { req }, input }) => {
    const data = await publicBookingService.getTableBookings({ ...input, clientId: req.user.id });
    if (!data) {
      logger.warn(
        `Attempted to receive bookings for table that doesn't exist. table: ${input.tableId}, user: ${req.user.phone_number}`
      );
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid tableId',
      });
    }
    return data;
  }),
  book: clientPrivateProcedure.input(bookTableDto).mutation(async ({ ctx: { req, prisma, ioService }, input }) => {
    const { numberPersons, tableId, timeEnd, timeStart, comment } = input;
    const startTime = dayjs(timeStart);
    const endTime = new Date(timeEnd);
    const from = startTime.toDate().getTime();
    const to = endTime.getTime();
    const currentTime = Date.now();
    const formattedStartTime = formatToWorkingHour({ timestamp: startTime });
    const formattedEndTime = formatToWorkingHour({ timestamp: endTime });

    const place = await bookingService.getPlaceByTableId({
      tableId,
      select: {
        id: true,
        bepaid_id: true,
        bepaid_secret_key: true,
        name: true,
        ReservesSettings: {
          select: {
            min_booking_time: true,
            unreachable_interval: true,
            time_between_reserves: true,
            delayed_response_time: true,
            response_time: true,
          },
        },
        WorkingHours: {
          select: {
            day: true,
            start_time: true,
            end_time: true,
            is_day_off: true,
          },
        },
      },
    });

    if (!place) {
      logger.error(
        `Attempted to book table that doesn't exist. table: ${input.tableId}, user: ${req.user.phone_number}`
      );
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Place not found',
      });
    }

    place.WorkingHours = sortWorkingHours(place.WorkingHours);
    const currentHours = place.WorkingHours[startTime.day()];

    if (
      currentHours.is_day_off ||
      formattedStartTime.getTime() < currentHours.start_time.getTime() ||
      formattedEndTime.getTime() > currentHours.end_time.getTime()
    ) {
      logger.error(
        `Attempted to book table during not working time. start time: ${formattedStartTime} end time: ${formattedEndTime} table: ${input.tableId}, user: ${req.user.phone_number}`
      );
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Place is not working in this time',
      });
    }

    const minTime = place.ReservesSettings.min_booking_time * 1000;
    const unreachableTime = place.ReservesSettings.unreachable_interval * 1000;
    const timeBetween = place.ReservesSettings.time_between_reserves * 1000;

    if (
      currentTime + unreachableTime >= to ||
      currentTime + unreachableTime >= from ||
      (from + minTime > to && from !== to)
    ) {
      logger.error(
        `Attempted to book table during not bookable. start time: ${formattedStartTime} end time: ${formattedEndTime} table: ${input.tableId}, user: ${req.user.phone_number}`
      );
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid time',
      });
    }

    const period = {
      startTime: new Date(startTime.toDate().getTime() - timeBetween),
      endTime: new Date(endTime.getTime() + timeBetween),
    };

    const reserves = await bookingService.getReservationsInPeriod({
      ...period,
      tableId,
      clientId: req.user.id,
    });

    if (reserves.length) {
      logger.error(
        `Attempted double booking. start time: ${formattedStartTime} end time: ${formattedEndTime} table: ${input.tableId}, user: ${req.user.phone_number}`
      );
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Client already booked this time',
      });
    }

    const workingHours = (await bookingService.getPlaceWorkingPeriod({ timestamp: currentTime, placeId: place.id }))!;
    let createdAt: Date | undefined;

    if (
      workingHours?.isDayOff ||
      currentTime > workingHours.endTime.getTime() ||
      currentTime < workingHours.startTime.getTime()
    ) {
      const timestamp = dayjs(currentTime);
      let days = 0;
      for (let index = timestamp.day(); index < place.WorkingHours.length; index++) {
        const element = place.WorkingHours[index];
        if (!element.is_day_off) {
          createdAt = dayjs(currentTime)
            .set('hour', element.start_time.getHours())
            .set('minute', element.start_time.getMinutes())
            .add(days, 'day')
            .add(place.ReservesSettings.delayed_response_time, 'second')
            .toDate();
          break;
        }
        if (!createdAt && place.WorkingHours.length - 1 === index && days <= 7) {
          index = 0;
        }
        days++;
      }

      if (!createdAt) {
        logger.error(
          `Valid attempt to book table while it's not working time failed. start time: ${formattedStartTime} end time: ${formattedEndTime} table: ${input.tableId}, user: ${req.user.phone_number}`
        );
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Place temporary not working',
        });
      }
    }
    const bookingNumber = await bookingService.getLastBookingNumber(tableId);

    const paymentsInfo = await calculatePayments({ input, placeId: place.id, prisma, clientId: req.user.id });
    const isClientNeedPay = paymentsInfo.totalAmount !== 0;
    const booking = await prisma.booking.create({
      data: {
        PreOrderMenuItem: paymentsInfo.preorderPayment?.PreOrderMenuItem
          ? {
              connect: paymentsInfo.preorderPayment.PreOrderMenuItem,
            }
          : undefined,
        deposit_payment_id: paymentsInfo.depositPayment?.id,
        pre_order_payment_id: paymentsInfo.preorderPayment?.id,
        payment_status: isClientNeedPay ? ETransactionStatus.pending_payment : undefined,
        created_at: createdAt,
        client_id: req.user.id,
        place_table_id: tableId,
        number_persons: numberPersons,
        booking_number: bookingNumber + 1,
        end_time: endTime.toISOString(),
        start_time: startTime.toISOString(),
        comment,
      },
      select: {
        id: true,
        Client: {
          select: {
            email: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            language: true,
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
          select: { status: true, checkout_token: true, created_at: true },
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
    let tokens: IGetCheckoutTokenResults | undefined;

    if (place.bepaid_id && place.bepaid_secret_key && isClientNeedPay) {
      await req.i18n.changeLanguage(booking.Client?.language || 'ru');
      const data = await bepaidService.getCheckoutToken({
        amount: paymentsInfo.totalAmount,
        bePaidId: place.bepaid_id,
        bookingDescription: req.t('bepaid.bookingDescription', { ns: 'bookings', place: place.name }),
        bookingId: booking.id,
        buttonText: req.t('bepaid.buttonText', { ns: 'bookings' }),
        customerName: req.user.first_name || '',
        customerPhoneNumber: req.user.phone_number || '',
        language: req.language,
        secretKey: place.bepaid_secret_key,
        theme: input.theme,
      });

      if (!('error' in data)) {
        tokens = data;
      } else {
        logger.error(`Payment failed. Message: ${data.message}. Errors: ${JSON.stringify(data.error)}`);
      }
      if (!tokens) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Payment failed' });
      }
    }

    let payment = null;

    if (!isClientNeedPay) {
      await sendNotificationToManager({ booking, ioService, prisma });
      const expiredAt = dayjs(createdAt || currentTime)
        .add(place.ReservesSettings.response_time, 'seconds')
        .toISOString();
      await bullMqService.addBookingExpiryJob({ bookingId: booking.id, expiredAt });
    } else {
      payment = await prisma.payment.create({
        data: {
          amount: paymentsInfo.totalAmount,
          checkout_token: tokens?.token || '',
          status: ETransactionStatus.pending_payment,
          // TODO add i18n internalization
          currency: 'BYN',
          Booking: {
            connect: {
              id: booking.id,
            },
          },
        },
        select: { status: true, checkout_token: true, created_at: true },
      });
    }

    booking['Payment'] = payment;

    return {
      booking,
      tokens,
    };
  }),
});
