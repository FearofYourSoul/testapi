import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { createFilterWhereInput, FilterMap } from '../../../utils/filters';
import { router } from '../../createRouter';
import { ESortField, getOwnerDto, getOwnerPlacesDto, getOwnersDto } from './dto';
import { employeeSortMapper } from './mappers';
import { adminPrivateProcedure } from '../../../privateProcedures';
import { ESortOrder } from '../dto';

enum EOwnerFilter {
  SEARCH = 'search',
}

export const ownerRouter = router({
  list: adminPrivateProcedure.input(getOwnersDto).query(async ({ ctx: { prisma }, input }) => {
    const filtersMap: FilterMap<EOwnerFilter, Prisma.OwnerWhereInput> = {
      search: {
        name: {
          contains: input.search,
          mode: 'insensitive',
        },
      },
    };

    const whereInput = createFilterWhereInput<EOwnerFilter, Prisma.OwnerWhereInput>(filtersMap, {
      search: input.search,
    });

    const searchOptions = {
      AND: [
        whereInput,
        {
          OR: [
            {
              is_email_verified: input.need_verification ? false : undefined,
            },
            {
              is_phone_verified: input.need_verification ? false : undefined,
            },
          ],
        },
      ],
    };

    const totalCount = await prisma.owner.count({
      where: searchOptions,
    });

    if (input.page > Math.ceil(totalCount / input.limit)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Page not found',
      });
    }

    const owners = await prisma.owner.findMany({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      where: searchOptions,
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
        updated_at: true,
        is_email_verified: true,
        phone_number: true,
        is_phone_verified: true,
      },
      orderBy: employeeSortMapper(input.sort ? input.sort : { sortField: ESortField.CREATED_AT, sortOrder: ESortOrder.DESC }),
    });

    return {
      totalCount,
      owners,
      page: input.page,
    };
  }),
  byId: adminPrivateProcedure.input(getOwnerDto).query(async ({ ctx: { prisma }, input }) => {
    const owner = await prisma.owner.findUnique({
      where: {
        id: input.owner_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
        updated_at: true,
        is_email_verified: true,
        phone_number: true,
        is_phone_verified: true,
      },
    });

    if (!owner) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Owner not found',
      });
    }

    return owner;
  }),
  places: adminPrivateProcedure.input(getOwnerPlacesDto).query(async ({ ctx: { prisma }, input }) => {
    const places = await prisma.place.findMany({
      where: {
        owner_id: input.owner_id,
      },
      take: input.limit + 1,
      select: {
        id: true,
        name: true,
        created_at: true,
      },
      cursor: input.cursor ? { id: input.cursor } : undefined,
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!places) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Places not found',
      });
    }

    let nextCursor: typeof input.cursor | undefined = undefined;
    if (places.length && places.length > input.limit) {
      const nextItem = places.pop();
      nextCursor = nextItem?.id;
    }

    return {
      places,
      nextCursor,
    };
  }),
  employees: adminPrivateProcedure.input(getOwnerPlacesDto).query(async ({ ctx: { prisma }, input }) => {
    const employees = await prisma.employee.findMany({
      where: {
        owner_id: input.owner_id,
      },
      take: input.limit + 1,
      select: {
        id: true,
        name: true,
        created_at: true,
        email: true,
        phone_number: true,
      },
      cursor: input.cursor ? { id: input.cursor } : undefined,
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!employees) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Employees not found',
      });
    }

    let nextCursor: typeof input.cursor | undefined = undefined;
    if (employees.length && employees.length > input.limit) {
      const nextItem = employees.pop();
      nextCursor = nextItem?.id;
    }

    return {
      employees,
      nextCursor,
    };
  })
});
