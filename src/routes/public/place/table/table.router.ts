import { TRPCError } from '@trpc/server';

import { publicProcedure, router } from '../../../createRouter';
import { bookingRouter } from './booking';
import { getTableDto, getTablesDto } from './dto';
import { logger } from '../../../../log';

export const tableRouter = router({
  list: publicProcedure.input(getTablesDto).query(async ({ ctx: { prisma }, input }) => {
    const tables = await prisma.placeTable.findMany({
      where: { place_section_id: input.sectionId, isActive: true, deleted_at: null },
      select: {
        id: true,
        name: true,
        angle: true,
        height: true,
        seats: true,
        shape: true,
        width: true,
        x: true,
        y: true,
      },
    });

    return tables;
  }),
  byId: publicProcedure.input(getTableDto).query(async ({ ctx: { prisma }, input }) => {
    const table = await prisma.placeTable.findUnique({
      where: { id: input.tableId },
      select: {
        id: true,
        name: true,
        angle: true,
        height: true,
        Image: {
          select: {
            id: true,
            small: true,
            medium: true,
            large: true,
            base: true,
          },
        },
        seats: true,
        shape: true,
        width: true,
      },
    });

    if (!table) {
      logger.debug(`attempted to get information about a non-existent table. table id: ${input.tableId}`);
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Table not found',
      });
    }

    return table;
  }),
  booking: bookingRouter,
});
