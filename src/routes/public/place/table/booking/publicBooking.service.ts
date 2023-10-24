import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { getBookingsTable, getBookingsTables } from './dto';
import { prisma } from '../../../../../utils/prisma';
import { bookingService } from '../../../../../services';

interface IGetSectionBookingsProps extends z.infer<typeof getBookingsTables> {
  clientId?: string;
}

interface IGetTableBookingsProps extends z.infer<typeof getBookingsTable> {
  clientId?: string;
}

class PublicBookingService {
  public async getSectionBookings(input: IGetSectionBookingsProps) {
    const placeWorkingData = await bookingService.getPlaceWorkingPeriod(input);

    if (!placeWorkingData) {
      return;
    }

    const { ReservesSettings } = (await prisma.place.findUnique({
      where: { id: placeWorkingData.workingHours.place_id || '' },
      select: { ReservesSettings: { select: { time_between_reserves: true } } },
    }))!;
    const timeBetween = ReservesSettings.time_between_reserves * 1000;

    const bookings = await bookingService.getReservationsInPeriod({
      ...placeWorkingData,
      sectionId: input.sectionId,
      clientId: input.clientId,
    });

    return {
      bookings: bookings.map((data) => {
        data.end_time = new Date(new Date(data.end_time).getTime() + timeBetween);
        return data;
      }),
    };
  }

  public async getTableBookings(input: IGetTableBookingsProps) {
    const table = await prisma.placeTable.findFirst({
      where: {
        id: input.tableId,
      },
      select: {
        place_section_id: true,
      },
    });

    if (!table) {
      return;
    }

    const placeWorkingData = await bookingService.getPlaceWorkingPeriod({
      timestamp: input.timestamp,
      sectionId: table.place_section_id,
    });

    if (!placeWorkingData) {
      return;
    }

    const { ReservesSettings } = (await prisma.place.findUnique({
      where: { id: placeWorkingData.workingHours.place_id || '' },
      select: { ReservesSettings: { select: { time_between_reserves: true } } },
    }))!;
    const timeBetween = ReservesSettings.time_between_reserves * 1000;

    let bookingData = await bookingService.getReservationsInPeriod({
      ...placeWorkingData,
      tableId: input.tableId,
      clientId: input.clientId,
    });

    return {
      bookings: bookingData.map((data) => {
        data.end_time = new Date(new Date(data.end_time).getTime() + timeBetween);
        return data;
      }),
    };
  }
}

export const publicBookingService = new PublicBookingService();
