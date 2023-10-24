import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { createFilterWhereInput, FilterMap } from '../../../utils/filters';
import { router } from '../../createRouter';
import { ESortField, getEmployeeDto, getEmployeePlacesDto, getEmployeesDto } from './dto';
import { employeeSortMapper } from './mappers';
import { adminPrivateProcedure } from '../../../privateProcedures';
import { ESortOrder } from '../dto';

enum EEmployeeFilter {
  SEARCH = 'search',
  ROLES = 'roles',
}

export const employeeRouter = router({
  list: adminPrivateProcedure.input(getEmployeesDto).query(async ({ ctx: { prisma }, input }) => {
    const filtersMap: FilterMap<EEmployeeFilter, Prisma.EmployeeWhereInput> = {
      search: {
        name: {
          contains: input.search,
          mode: 'insensitive',
        },
      },
      roles: {
        role: {
          in: input.roles,
        },
      },
    };

    const whereInput = createFilterWhereInput<EEmployeeFilter, Prisma.EmployeeWhereInput>(filtersMap, {
      search: input.search,
      roles: input.roles,
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

    const totalCount = await prisma.employee.count({
      where: searchOptions,
    });

    if (input.page > Math.ceil(totalCount / input.limit)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Page not found',
      });
    }

    const employees = await prisma.employee.findMany({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      where: searchOptions,
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
        updated_at: true,
        login: true,
        is_email_verified: true,
        phone_number: true,
        is_phone_verified: true,
        owner_id: true,
        role: true,
      },
      orderBy: employeeSortMapper(input.sort ? input.sort : { sortField: ESortField.CREATED_AT, sortOrder: ESortOrder.DESC }),
    });

    return {
      totalCount,
      employees,
      page: input.page,
    };
  }),
  byId: adminPrivateProcedure.input(getEmployeeDto).query(async ({ ctx: { prisma }, input }) => {
    const employee = await prisma.employee.findUnique({
      where: {
        id: input.employee_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
        updated_at: true,
        login: true,
        is_email_verified: true,
        phone_number: true,
        is_phone_verified: true,
        owner_id: true,
        role: true,
        Owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
          },
        },
      },
    });

    if (!employee) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Employee not found',
      });
    }

    return employee;
  }),
  places: adminPrivateProcedure.input(getEmployeePlacesDto).query(async ({ ctx: { prisma }, input }) => {
    const { limit = 5, cursor, employee_id } = input;

    const places = await prisma.employeePlace.findMany({
      where: {
        employee_id,
      },
      take: limit + 1,
      select: {
        place_id: true,
        Place: {
          select: {
            name: true,
            created_at: true,
          },
        },
      },
      cursor:
        cursor && employee_id
          ? {
              place_id_employee_id: {
                place_id: cursor,
                employee_id,
              },
            }
          : undefined,
      orderBy: {
        place_id: 'asc',
      },
    });

    if (!places) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Places not found',
      });
    }

    let nextCursor: typeof cursor | undefined = undefined;
    if (places.length && places.length > limit) {
      const nextItem = places.pop();
      nextCursor = nextItem?.place_id;
    }

    return {
      places,
      nextCursor,
    };
  }),
});
