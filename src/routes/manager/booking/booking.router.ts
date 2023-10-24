import { TRPCError } from '@trpc/server';
import dayjs from 'dayjs';
import phone from 'phone';
import { EBookingStatus, EEmployeeRole, ETransactionStatus, Prisma } from '@prisma/client';

import {
  ICommonTransactionResponse,
  bepaidService,
  bookingService,
  bullMqService,
  expoPushService,
} from '../../../services';
import { router } from '../../createRouter';
import {
  EBookingsPages,
  changeBookingStatusDto,
  createBookingDto,
  getBookingDto,
  getBookingsDto,
  getClientBookingsDto,
  getConflictsDto,
  getTableBookingsDto,
  updateBookingDto,
} from './dto';
import { managerPrivateProcedure } from '../../../privateProcedures';
import { clientRouter } from './client';
import { TRoleType } from '../manager.router';
import { logger } from '../../../log';
import { paymentRouter } from './payment';

const getMode = (mode?: EBookingsPages) => {
  const currentTime = dayjs().toDate().toISOString();

  switch (mode) {
    case EBookingsPages.ARCHIVE:
      return {
        status: {
          in: [EBookingStatus.REJECTED, EBookingStatus.CLOSED, EBookingStatus.CANCELED, EBookingStatus.EXPIRED],
        },
      };
    case EBookingsPages.WAITING:
      return {
        status: EBookingStatus.ACCEPTED,
        end_time: {
          gte: currentTime,
        },
        start_time: {
          lte: currentTime,
        },
      };
    case EBookingsPages.OPEN:
      return {
        status: EBookingStatus.IN_PROGRESS,
      };
    case EBookingsPages.NEW:
      return {
        status: EBookingStatus.ACCEPTED,
        end_time: {
          gte: currentTime,
        },
        start_time: {
          gte: currentTime,
        },
      };
    default:
      break;
  }
};

const bookingSelect = {
  id: true,
  end_time: true,
  start_time: true,
  status: true,
  number_persons: true,
  booking_number: true,
  created_at: true,
  comment: true,
  manager_comment: true,
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
              ClientRating: {
                select: {
                  id: true,
                  name: true,
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
};

export const bookingRouter = router({
  list: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(getBookingsDto)
    .query(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const startTime = dayjs(input.period?.from).toDate().toISOString();
      const endTime = dayjs(input.period?.to).toDate().toISOString();
      const mode = getMode(input.mode) || {};
      const sections = input.sectionIds?.filter((value) => !!value);

      if (input.status?.length === 1 && input.status[0] === EBookingStatus.WAITING) {
        const place = await prisma.place.findFirst({
          where: { ...whereCondition.PlaceTable.PlaceSection.Place, id: input.placeId },
          select: {
            ReservesSettings: {
              select: {
                response_time: true,
              },
            },
            PlaceSection: {
              select: {
                id: true,
              },
            },
          },
        });

        if (!place) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid placeId' });
        }

        const timeFromNow = dayjs().subtract(place.ReservesSettings.response_time, 'seconds');

        await prisma.booking.updateMany({
          where: {
            status: EBookingStatus.WAITING,
            created_at: {
              lte: timeFromNow.toDate(),
            },
            PlaceTable: {
              place_section_id: {
                in: place.PlaceSection.map(({ id }) => id),
              },
            },
          },
          data: { status: EBookingStatus.REJECTED },
        });
      }

      const whereInput: Prisma.BookingWhereInput = {
        AND: [
          {
            status: {
              in: input.status,
              not:
                input.mode === EBookingsPages.ARCHIVE || !input.mode || input.status?.includes(EBookingStatus.REJECTED)
                  ? undefined
                  : EBookingStatus.REJECTED,
            },
          },
          {
            status: input.status?.includes(EBookingStatus.WAITING)
              ? {
                  in: input.status,
                }
              : {
                  not: EBookingStatus.WAITING,
                },
          },
          {
            OR: [
              {
                payment_status: {
                  not: ETransactionStatus.pending_payment,
                },
              },
              { payment_status: null },
            ],
          },
          {
            OR: input.period
              ? [
                  {
                    end_time: {
                      gte: startTime,
                      lte: endTime,
                    },
                  },
                  {
                    start_time: {
                      gte: startTime,
                      lte: endTime,
                    },
                  },
                  {
                    end_time: {
                      gte: endTime,
                    },
                    start_time: {
                      lte: startTime,
                    },
                  },
                ]
              : undefined,
          },
          {
            Client: input.search
              ? {
                  OR: [
                    {
                      first_name: {
                        contains: input.search,
                      },
                    },
                    {
                      last_name: {
                        contains: input.search,
                      },
                    },
                    {
                      phone_number: {
                        contains: input.search,
                      },
                    },
                  ],
                }
              : undefined,
            PlaceTable: {
              PlaceSection: {
                ...whereCondition.PlaceTable.PlaceSection,
                place_id: input.placeId,
                id:
                  sections && !!sections.length
                    ? {
                        in: input.sectionIds,
                      }
                    : undefined,
              },
            },
          },
          mode,
        ],
      };

      const totalCount = await prisma.booking.count({ where: whereInput });

      const bookings = await prisma.booking.findMany({
        where: whereInput,
        take: input.limit ? input.limit + 1 : undefined,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          ...bookingSelect,
          Client: {
            select: {
              email: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              id: true,
              AverageClientRating: {
                where: {
                  ClientRatingField: {
                    place_id: input.placeId,
                  },
                },
                select: {
                  average_rating: true,
                  id: true,
                  rating_name: true,
                  success_bookings: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      let nextCursor: typeof input.cursor | undefined;
      if (bookings.length > input.limit) {
        const nextItem = bookings.pop();
        nextCursor = nextItem!.id;
      }

      return {
        bookings,
        totalCount,
        nextCursor,
      };
    }),
  byId: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(getBookingDto)
    .query(async ({ ctx: { prisma, whereCondition, req }, input }) => {
      const booking = await prisma.booking.findFirst({
        where: {
          id: input.bookingId,
          PlaceTable: whereCondition.PlaceTable,
        },
        select: {
          ...bookingSelect,
          Client: {
            select: {
              email: true,
              date_birth: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              id: true,
            },
          },
        },
      });

      if (!booking) {
        logger.debug(`Attempted to get booking that doesn't exist. booking ${input.bookingId} user: ${req.user.id}`);
        throw new TRPCError({
          message: 'Booking not found',
          code: 'NOT_FOUND',
        });
      }

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
          rating_field_id: true,
        },
      });

      return {
        booking,
        averageRating,
      };
    }),
  conflicts: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(getConflictsDto)
    .query(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const conflicts = await bookingService.getReservationsInPeriod({
        // userId: req.user.id,
        tableId: input.tableId,
        endTime: new Date(input.period.to),
        startTime: new Date(input.period.from),
        excludeIds: input.excludeIds,
      });

      return conflicts;
    }),
  byClientId: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(getClientBookingsDto)
    .query(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const whereInput = {
        status: input.bookingsTypes?.length
          ? {
              in: input.bookingsTypes,
            }
          : undefined,
        PlaceTable: {
          PlaceSection: {
            ...whereCondition.PlaceTable.PlaceSection,
            place_id: input.placeId,
          },
        },
        place_table_id: input.tableId,
        client_id: input.clientId,
      };

      const totalCount = await prisma.booking.count({ where: whereInput });

      const bookings = await prisma.booking.findMany({
        where: whereInput,
        take: input.limit ? input.limit + 1 : undefined,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          ...bookingSelect,
          PlaceTable: false,
          BookingNotification: {
            where: {
              booking_status: EBookingStatus.CLOSED,
            },
            select: {
              ManagerNotification: {
                select: {
                  Employee: {
                    select: {
                      name: true,
                      id: true,
                    },
                  },
                  Owner: {
                    select: {
                      name: true,
                      id: true,
                    },
                  },
                },
              },
            },
          },
          ClientRating: {
            select: {
              id: true,
              comment: true,
              rating: true,
              ClientRatingField: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      let nextCursor: typeof input.cursor | undefined;
      if (input.limit && bookings.length > input.limit) {
        const nextItem = bookings.pop();
        nextCursor = nextItem!.id;
      }

      return { bookings, nextCursor, totalCount };
    }),
  byTableId: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(getTableBookingsDto)
    .query(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const startTime = dayjs(input.period?.from).toDate().toISOString();
      const endTime = dayjs(input.period?.to).toDate().toISOString();

      const table = await prisma.placeTable.findFirst({
        where: {
          id: input.tableId,
          PlaceSection: whereCondition.PlaceTable.PlaceSection,
        },
        select: {
          PlaceSection: {
            select: {
              place_id: true,
            },
          },
        },
      });

      if (!table) {
        logger.debug(
          `Attempted to get booking by table id that doesn't exist. table ${input.tableId} user: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Table not found',
        });
      }

      const bookings = await prisma.booking.findMany({
        cursor: input.cursor ? { id: input.cursor } : undefined,
        take: input.limit + 1,
        orderBy: {
          created_at: 'desc',
        },
        where: {
          PlaceTable: {
            id: input.tableId,
          },
          OR: [
            {
              end_time: {
                gt: startTime,
                lt: endTime,
              },
            },
            {
              start_time: {
                gt: startTime,
                lt: endTime,
              },
            },
            {
              end_time: {
                gte: endTime,
              },
              start_time: {
                lte: startTime,
              },
            },
            {
              status: EBookingStatus.WAITING,
            },
          ],
        },
        select: {
          ...bookingSelect,
          Client: {
            select: {
              email: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              id: true,
              AverageClientRating: {
                where: {
                  ClientRatingField: {
                    place_id: table.PlaceSection.place_id,
                  },
                },
                select: {
                  average_rating: true,
                  id: true,
                  rating_name: true,
                  success_bookings: true,
                },
              },
            },
          },
        },
      });

      let nextCursor: typeof input.cursor | undefined;
      if (bookings.length > input.limit) {
        const nextItem = bookings.pop();
        nextCursor = nextItem!.id;
      }

      return {
        bookings,
        nextCursor,
      };
    }),
  create: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(createBookingDto)
    .mutation(async ({ ctx: { req, prisma, ioService, whereCondition }, input }) => {
      const startTime = new Date(input.period.startTime);
      const endTime = new Date(input.period.endTime);
      const from = startTime.getTime();
      const to = endTime.getTime();
      const currentTime = Date.now();

      const place = await bookingService.getPlaceByTableId({
        tableId: input.tableId,
        select: {
          ReservesSettings: {
            select: {
              min_booking_time: true,
              unreachable_interval: true,
              time_between_reserves: true,
              delayed_response_time: true,
            },
          },
        },
      });

      if (!place) {
        logger.error(`Attempted to book table that doesn't exist. table: ${input.tableId}, manager: ${req.user.id}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Place not found',
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
        logger.warn(
          `Attempted to book table during not bookable. start time: ${startTime} end time: ${endTime}, table: ${input.tableId}, manager: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid time',
        });
      }

      const period = {
        startTime: new Date(startTime.getTime() - timeBetween),
        endTime: new Date(endTime.getTime() + timeBetween),
      };

      const bookedReserves = await bookingService.getReservationsInPeriod({
        ...period,
        tableId: input.tableId,
        clientId: req.user.id,
      });

      if (bookedReserves.length) {
        logger.warn(
          `Attempted to book table that already booked. start time: ${startTime} end time: ${endTime} table: ${input.tableId}, manager: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Client already booked this time',
        });
      }

      const table = await prisma.placeTable.findFirst({
        where: {
          id: input.tableId,
          PlaceSection: whereCondition.PlaceTable.PlaceSection,
        },
        select: {
          id: true,
        },
      });

      if (!table) {
        logger.error(`Attempted to book table that doesn't exist. table: ${input.tableId}, manager: ${req.user.id}`);
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const phone_number = input.phoneNumber ? phone(input.phoneNumber).phoneNumber || '' : '';
      const client = await prisma.client.upsert({
        where: {
          phone_number,
        },
        update: { first_name: input.name },
        create: {
          first_name: input.name,
          phone_number: !phone_number ? undefined : phone_number,
        },
        select: {
          email: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          id: true,
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
      const reserves = await bookingService.getReservationsInPeriod({
        startTime,
        endTime,
        tableId: input.tableId,
      });

      if (reserves.length) {
        logger.error(
          `Attempted book already booked table. start time: ${startTime} end time: ${endTime} table: ${input.tableId}, manager: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Table already booked',
        });
      }

      const bookingNumber = await bookingService.getLastBookingNumber(input.tableId);
      const booking = await prisma.booking.create({
        data: {
          booking_number: bookingNumber,
          status: input.status,
          number_persons: input.personsCount,
          client_id: client.id,
          end_time: input.period.endTime,
          start_time: input.period.startTime,
          place_table_id: table.id,
        },
        select: bookingSelect,
      });

      let manager = {};
      if ('role' in req.user) {
        manager = {
          Employee: {
            connect: {
              id: req.user.id,
            },
          },
        };
      } else {
        manager = {
          Owner: {
            connect: {
              id: req.user.id,
            },
          },
        };
      }

      await prisma.managerNotification.create({
        data: {
          ...manager,
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

      return { ...booking, Client: client };
    }),
  changeStatus: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(changeBookingStatusDto)
    .mutation(async ({ ctx: { req, prisma, ioService }, input }) => {
      if (input.endTime && input.status === 'ACCEPTED') {
        const hasBookings = await bookingService.hasBookingsInTime({ ...input, userId: req.user.id });

        if (hasBookings) {
          logger.warn(
            `Attempted book already booked table. end time: ${input.endTime} booking: ${input.bookingId}, manager: ${req.user.id}`
          );
          throw new TRPCError({ code: 'CONFLICT', message: 'Has bookings in this time' });
        }
      }

      const acceptedBooking = await bookingService.changeBookingStatus({
        ...input,
        user: {
          name: req.user.name,
          role: ('role' in req.user ? req.user.role : 'owner') as TRoleType,
        },
      });

      let manager = {};
      if ('role' in req.user) {
        manager = {
          Employee: {
            connect: {
              id: req.user.id,
            },
          },
        };
      } else {
        manager = {
          Owner: {
            connect: {
              id: req.user.id,
            },
          },
        };
      }

      const notification = await prisma.managerNotification.create({
        data: {
          ...manager,
          BookingNotification: {
            create: {
              booking_id: acceptedBooking.id,
              booking_status: acceptedBooking.status,
              place_id: acceptedBooking.PlaceTable.PlaceSection.place_id,
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (acceptedBooking.status === EBookingStatus.ACCEPTED || acceptedBooking.status === EBookingStatus.REJECTED) {
        await bullMqService.removeBookingExpiryJob(acceptedBooking.id);

        const clientReq = prisma.client.findUnique({
          where: { id: acceptedBooking.client_id },
          select: {
            expo_token: true,
            language: true,
            push_notifications: true,
          },
        });
        const placeReq = prisma.place.findUnique({
          where: { id: acceptedBooking.PlaceTable.PlaceSection.place_id },
          select: { id: true, name: true, bepaid_id: true, bepaid_secret_key: true },
        });
        const [client, place] = await prisma.$transaction([clientReq, placeReq]);

        if (acceptedBooking.Payment && place?.bepaid_id && place?.bepaid_secret_key) {
          if (!acceptedBooking.Payment.bepaid_uid) {
            logger.error(`Payment can't be canceled, because it doesn't has uid: id ${acceptedBooking.Payment?.id}`);
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
          }
          let bepaidInfo: ICommonTransactionResponse['transaction'];
          let paymentData: {
            canceled_at?: Date;
            debited_at?: Date;
            bepaid_cancel_id?: string;
            bepaid_captures_id?: string;
          };
          if (acceptedBooking.status === 'ACCEPTED') {
            bepaidInfo = await bepaidService.debitFunds({
              amount: acceptedBooking.Payment.amount,
              uid: acceptedBooking.Payment.bepaid_uid,
              bePaidId: place.bepaid_id,
              secretKey: place.bepaid_secret_key,
            });
            paymentData = {
              debited_at: new Date(),
              bepaid_captures_id: bepaidInfo.uid,
            };
          } else {
            bepaidInfo = await bepaidService.cancelAuthorization({
              amount: acceptedBooking.Payment.amount,
              uid: acceptedBooking.Payment.bepaid_uid,
              bePaidId: place.bepaid_id,
              secretKey: place.bepaid_secret_key,
            });
            paymentData = {
              canceled_at: new Date(),
              bepaid_cancel_id: bepaidInfo.uid,
            };
          }

          const payment = prisma.payment.update({
            where: {
              id: acceptedBooking.Payment.id,
            },
            data: {
              ...paymentData,
              status: bepaidInfo.status,
            },
          });

          const booking = prisma.booking.update({
            where: { id: acceptedBooking.id },
            data: {
              payment_status: bepaidInfo.status,
            },
          });

          await prisma.$transaction([payment, booking]);
        }

        if (place && client && client.push_notifications && client.expo_token) {
          const lng = client.language || 'ru';
          const status = req.t(`statuses.${acceptedBooking.status}`, { ns: 'notifications', lng });
          const from = dayjs(acceptedBooking.start_time).format('HH:mm');
          const to = dayjs(acceptedBooking.end_time).format('HH:mm');
          const message = req.t('message', {
            ns: 'notifications',
            status,
            time: `${from === to ? from : `${from}-${to}`}`,
            name: place.name,
            lng,
          });
          await expoPushService.sendNotification({
            pushToken: client.expo_token,
            data: {
              bookingId: acceptedBooking.id,
              orderNumber: acceptedBooking.booking_number,
              placeId: place.id,
            },
            title: 'Mesto',
            message,
          });
        }
      }

      ioService.sendAcceptBooking({ ...acceptedBooking, notificationId: notification.id });
      ioService.customerService.sendChangedBookingStatus({
        id: acceptedBooking.id,
        status: acceptedBooking.status,
        clientId: acceptedBooking.client_id,
      });

      return acceptedBooking;
    }),
  update: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(updateBookingDto)
    .mutation(async ({ ctx: { req, prisma }, input }) => {
      const booking = await prisma.booking.findUnique({
        where: {
          id: input.bookingId,
        },
        select: {
          id: true,
          start_time: true,
          end_time: true,
          place_table_id: true,
        },
      });

      if (!booking?.id) {
        logger.warn(
          `Attempted to update booking that doesn't exist. start time: ${input.startTime} end time: ${input.endTime}, booking: ${input.bookingId}, manager: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Booking not found',
        });
      }

      if (input.startTime && input.endTime) {
        const startTime = new Date(input.startTime);
        const endTime = new Date(input.endTime);
        const from = startTime.getTime();
        const to = endTime.getTime();
        const currentTime = Date.now();

        const place = await bookingService.getPlaceByTableId({
          tableId: booking.place_table_id,
          select: {
            ReservesSettings: {
              select: {
                min_booking_time: true,
                unreachable_interval: true,
                time_between_reserves: true,
                delayed_response_time: true,
              },
            },
          },
        });

        if (!place) {
          logger.error(`Attempted to book table that doesn't exist. table: ${input.tableId}, manager: ${req.user.id}`);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Place not found',
          });
        }

        const minTime = place.ReservesSettings.min_booking_time * 1000;
        const unreachableTime = place.ReservesSettings.unreachable_interval * 1000;

        if (
          currentTime + unreachableTime >= to ||
          currentTime + unreachableTime >= from ||
          (from + minTime > to && from !== to)
        ) {
          logger.warn(
            `Attempted to book table during not bookable. start time: ${startTime} end time: ${endTime}, table: ${input.tableId}, manager: ${req.user.id}`
          );
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid time',
          });
        }
      }

      const hasBookings = await bookingService.hasBookingsInTime({
        userId: req.user.id,
        bookingId: input.bookingId,
        endTime: input.endTime,
        startTime: input.startTime,
        tableId: input.tableId,

        statuses: ['ACCEPTED', 'IN_PROGRESS'],
      });

      if (hasBookings) {
        logger.warn(
          `Attempted book already booked table. end time: ${input.endTime} booking: ${input.bookingId}, manager: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This time already taken',
        });
      }

      const updatedBooking = await prisma.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          end_time: input.endTime,
          start_time: input.startTime,
          manager_comment: input.managerComment,
          place_table_id: input.tableId,
          number_persons: input.personsAmount,
        },
        select: bookingSelect,
      });

      return updatedBooking;
    }),
  client: clientRouter,
  payment: paymentRouter,
});
