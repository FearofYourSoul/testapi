import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { createFilterWhereInput, FilterMap } from '../../../utils/filters';
import { router } from '../../createRouter';
import { ESortField, getClientBookingTablesDto, getClientDto, getClientsDto } from './dto';
import { clientSortMapper } from './mappers';
import { adminPrivateProcedure } from '../../../privateProcedures';
import { ESortOrder } from '../dto';

enum EClientFilter {
  SEARCH = 'search',
}

export const clientRouter = router({
  list: adminPrivateProcedure.input(getClientsDto).query(async ({ ctx: { prisma }, input }) => {
    const filtersMap: FilterMap<EClientFilter, Prisma.ClientWhereInput> = {
      search: {
        OR: [
          {
            first_name: {
              contains: input.search,
              mode: 'insensitive',
            },
          },
          {
            last_name: {
              contains: input.search,
              mode: 'insensitive',
            },
          },
        ],
      },
    };

    const whereInput = createFilterWhereInput<EClientFilter, Prisma.ClientWhereInput>(filtersMap, {
      search: input.search,
    });

    const totalCount = await prisma.client.count({
      where: whereInput,
    });

    if (input.page > Math.ceil(totalCount / input.limit)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Page not found',
      });
    }

    const clients = await prisma.client.findMany({
      skip: (input.page - 1) * input.limit!,
      take: input.limit,
      where: whereInput,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        created_at: true,
        updated_at: true,
        date_birth: true,
        verification_code: true,
        phone_number: true,
      },
      orderBy: clientSortMapper(input.sort ? input.sort : { sortField: ESortField.CREATED_AT, sortOrder: ESortOrder.DESC }),
    });

    const result = clients.map((client) => ({
      id: client.id,
      name: client.first_name + ' ' + client.last_name,
      created_at: client.created_at,
      updated_at: client.updated_at,
      date_birth: client.date_birth,
      email: client.email,
      verification_code: client.verification_code,
      phone_number: client.phone_number,
    }));

    return {
      totalCount,
      clients: result,
      page: input.page,
    };
  }),
  byId: adminPrivateProcedure.input(getClientDto).query(async ({ ctx: { prisma }, input }) => {
    const client = await prisma.client.findUnique({
      where: {
        id: input.client_id,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        date_birth: true,
        verification_code: true,
        phone_number: true,
      },
    });

    if (!client) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Client not found',
      });
    }

    return client;
  }),
  bookingTables: adminPrivateProcedure.input(getClientBookingTablesDto).query(async ({ ctx: { prisma }, input }) => {
    const bookingTables = await prisma.booking.findMany({
      where: {
        client_id: input.client_id,
      },
      take: input.limit + 1,
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        place_table_id: true,
      },
      cursor: input.cursor ? { id: input.cursor } : undefined,
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!bookingTables) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Booking Tables not found',
      });
    }

    let nextCursor: typeof input.cursor | undefined = undefined;
    if (bookingTables.length && bookingTables.length > input.limit) {
      const nextItem = bookingTables.pop();
      nextCursor = nextItem?.id;
    }

    return {
      bookingTables,
      nextCursor,
    };
  }),
});
