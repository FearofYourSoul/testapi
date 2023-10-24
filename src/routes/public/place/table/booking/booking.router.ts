import { TRPCError } from '@trpc/server';

import { publicProcedure, router } from '../../../../createRouter';
import { checkBookingStatusDto, getBookingsTable, getBookingsTables } from './dto';
import { publicBookingService } from './publicBooking.service';
import { logger } from '../../../../../log';
import { EBookingStatus, ETransactionStatus } from '@prisma/client';
import dayjs from 'dayjs';

export const bookingRouter = router({
  list: publicProcedure.input(getBookingsTables).query(async ({ ctx: { prisma }, input }) => {
    const data = await publicBookingService.getSectionBookings(input);
    if (!data) {
      logger.error(`attempted to list bookings info for inexisting section. section: ${input.sectionId}`);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid sectionId',
      });
    }
    return data;
  }),
  byTableId: publicProcedure.input(getBookingsTable).query(async ({ ctx: { prisma }, input }) => {
    const data = await publicBookingService.getTableBookings(input);
    if (!data) {
      logger.error(`attempted to list bookings info for inexisting table. table: ${input.tableId}`);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid tableId',
      });
    }
    return data;
  }),
  checkBookingStatus: publicProcedure
    .input(checkBookingStatusDto)
    .mutation(async ({ ctx: { req, prisma, ioService }, input }) => {
      const booking = await prisma.booking.findFirst({
        where: {
          id: input.bookingId,
        },
        select: {
          id: true,
          created_at: true,
          status: true,
          Payment: {
            select: { status: true, checkout_token: true, created_at: true },
          },
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Booking with such id not found',
        });
      }

      if (booking.Payment?.status === ETransactionStatus.pending_payment) {
        // need to wait wh
        booking.Payment.created_at = dayjs(booking.Payment.created_at).add(15, 'seconds').toDate();
      }

      return booking;
    }),
});
