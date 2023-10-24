import { EBookingStatus, EDayOfWeek, Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import dayjs from 'dayjs';
import toObject from 'dayjs/plugin/toObject';

import { TChangeBookingStatusDto } from '../routes/manager/booking/dto';
import { prisma } from '../utils/prisma';
import { TRoleType } from '../routes/manager';

interface IGetTableReservations {
  // userId: string;
  clientId?: string;
  endTime?: Date;
  excludeIds?: Array<string>;
  sectionId?: string;
  startTime?: Date;
  tableId?: string;
}

interface IGetTimePeriod {
  placeId?: string;
  sectionId?: string;
  timestamp: string | number | Date | dayjs.Dayjs;
}

dayjs.extend(toObject);

class BookingService {
  async getPlaceWorkingPeriod(input: IGetTimePeriod) {
    const timestamp = dayjs(input.timestamp);

    const weekday = Object.values(EDayOfWeek)[timestamp.day()];
    let placeId = input.placeId;

    if (!placeId) {
      placeId = (
        await prisma.placeSection.findFirst({ where: { id: input.sectionId || '' }, select: { place_id: true } })
      )?.place_id;
    }

    const workingHours = await prisma.workingHours.findFirst({
      where: {
        day: weekday,
        place_id: placeId || '',
      },
    });

    if (!workingHours) {
      return;
    }

    let startTime = timestamp.subtract(12, 'hours');
    let endTime = timestamp.add(12, 'hours');

    if (!workingHours.is_working_all_day && !workingHours.is_day_off) {
      const { hours, minutes } = dayjs(workingHours.start_time).toObject();
      const { hours: endHours, minutes: endMinutes } = dayjs(workingHours.end_time).toObject();
      startTime = dayjs(timestamp).set('hour', hours).set('minute', minutes);
      endTime = dayjs(timestamp).set('hour', endHours).set('minute', endMinutes);
      if (timestamp.hour() > endHours) {
        endTime = endTime.add(1, 'day');
      }
    }

    return {
      startTime: startTime.toDate(),
      endTime: endTime.toDate(),
      workingHours,
      isDayOff: workingHours.is_day_off,
    };
  }

  // TODO: split to public part and private
  async getReservationsInPeriod({
    // userId,
    clientId,
    endTime,
    excludeIds,
    sectionId,
    startTime,
    tableId,
  }: IGetTableReservations) {
    const bookingTables = await prisma.booking.findMany({
      where: {
        id: excludeIds?.length
          ? {
              notIn: excludeIds,
            }
          : undefined,
        place_table_id: tableId,
        PlaceTable: {
          ...(sectionId ? { place_section_id: sectionId } : {}),
          // PlaceSection: {
          //   Place: {
          //     OR: [
          //       { owner_id: userId },
          //       {
          //         Employee: {
          //           some: {
          //             employee_id: userId,
          //           },
          //         },
          //       },
          //     ],
          //   },
          // },
        },
        AND: [
          {
            OR: [
              {
                status: {
                  in: ['ACCEPTED', 'IN_PROGRESS'],
                },
                client_id: {
                  not: clientId,
                },
              },
              {
                client_id: clientId,
              },
            ],
          },
          {
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
            ],
          },
        ],
      },
      select: {
        id: true,
        end_time: true,
        start_time: true,
        booking_number: true,
        PlaceTable: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        start_time: 'desc',
      },
    });

    return bookingTables;
  }

  public async changeBookingStatus(input: TChangeBookingStatusDto & { user: { name: string; role: TRoleType } }) {
    let startTime: Date | undefined;

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

    const place = await this.getPlaceByTableId({
      tableId: booking?.place_table_id || '',
      select: {
        ReservesSettings: {
          select: { min_booking_time: true, time_between_reserves: true },
        },
      },
    });

    if (!booking?.id || !place) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Booking not found',
      });
    }

    const timeFrom = new Date(booking.start_time).getTime() + place.ReservesSettings.min_booking_time * 1000;

    if (input.endTime && timeFrom > new Date(input.endTime).getTime()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid time',
      });
    }

    if (input.status === 'IN_PROGRESS') {
      const bookingStartTime = new Date(booking.start_time);
      startTime = bookingStartTime.getTime() < Date.now() ? bookingStartTime : new Date();

      const conflictBooking = await prisma.booking.findFirst({
        where: {
          status: 'IN_PROGRESS',
          place_table_id: booking.place_table_id,
          start_time: {
            lte: startTime,
          },
          end_time: {
            gte: startTime,
          },
        },
      });

      if (conflictBooking) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: JSON.stringify({ message: 'Booking in progress', bookingId: conflictBooking?.id }),
        });
      }
    }

    const acceptedBooking = await prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: input.status,
        end_time: input.endTime,
        start_time: startTime,
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

    if (input.status === 'CLOSED') {
      await prisma.visitedPlace.upsert({
        where: {
          place_id_client_id: {
            client_id: acceptedBooking.client_id,
            place_id: acceptedBooking.PlaceTable.PlaceSection.place_id,
          },
        },
        create: {
          last_visit: acceptedBooking.end_time,
          client_id: acceptedBooking.client_id,
          place_id: acceptedBooking.PlaceTable.PlaceSection.place_id,
        },
        update: {
          last_visit: acceptedBooking.end_time,
        },
      });
    }

    const averageRating = await prisma.averageClientRating.findMany({
      where: {
        ClientRatingField: {
          place_id: acceptedBooking.PlaceTable.PlaceSection.place_id,
        },
        client_id: acceptedBooking.client_id,
      },
      select: {
        average_rating: true,
        id: true,
        rating_name: true,
        success_bookings: true,
      },
    });

    const res = {
      ...acceptedBooking,
      AverageClientRating: averageRating,
      user: input.user,
    };

    return res;
  }

  public async hasBookingsInTime({
    userId,
    bookingId,
    endTime,
    startTime: start,
    statuses = ['ACCEPTED'],
    tableId,
  }: {
    userId: string;
    endTime?: string | Date;
    startTime?: string | Date;
    bookingId: string;
    tableId?: string;
    statuses?: Array<EBookingStatus>;
  }) {
    let startTime = start;

    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        start_time: true,
        place_table_id: true,
      },
    });

    if (!booking) {
      return false;
    }

    if (!startTime) {
      startTime = booking.start_time;
    }

    const bookingsCount = await prisma.booking.count({
      where: {
        id: {
          not: bookingId,
        },
        PlaceTable: {
          PlaceSection: {
            Place: {
              OR: [
                { owner_id: userId },
                {
                  Employee: {
                    some: {
                      employee_id: userId,
                    },
                  },
                },
              ],
            },
          },
        },
        status: {
          in: statuses,
        },
        place_table_id: tableId || booking.place_table_id,
        OR: [
          {
            start_time: {
              lt: endTime,
            },
            end_time: {
              gt: endTime,
            },
          },
          {
            start_time: {
              lt: startTime,
            },
            end_time: {
              gt: startTime,
            },
          },
          {
            start_time: {
              gte: startTime,
              lte: endTime,
            },
            end_time: {
              gte: startTime,
              lte: endTime,
            },
          },
        ],
      },
    });

    return bookingsCount !== 0;
  }

  public async getLastBookingNumber(tableId: string) {
    return (
      (
        await prisma.booking.findFirst({
          where: {
            PlaceTable: {
              id: tableId,
            },
          },
          select: { booking_number: true },
          orderBy: {
            created_at: 'desc',
          },
        })
      )?.booking_number || 0
    );
  }

  public async getPlaceByTableId<T extends NonNullable<Parameters<typeof prisma.place.findFirst>[0]>['select']>({
    select,
    tableId,
  }: {
    tableId: string;
    select?: T;
  }) {
    const table = await prisma.placeTable.findUnique({
      where: { id: tableId },
      select: { PlaceSection: { select: { place_id: true } } },
    });

    if (!table) {
      return;
    }
    const place = await prisma.place.findFirst({
      where: {
        id: table?.PlaceSection.place_id,
      },
      select: select || ({ id: true } as T),
    });

    return place || undefined;
  }
}

export const bookingService = new BookingService();
