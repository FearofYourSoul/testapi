import { TRPCError } from '@trpc/server';

import { router } from '../createRouter';
import { clientRouter } from './client';
import { ESortField, ESortOrder, getAdminDto, getAdminsDto } from './dto';
import { employeeRouter } from './employee';
import { adminSortMapper } from './mappers';
import { ownerRouter } from './owner';
import { adminPrivateProcedure } from '../../privateProcedures';

export const adminRouter = router({
  list: adminPrivateProcedure.input(getAdminsDto).query(async ({ ctx: { prisma }, input }) => {
    const totalCount = await prisma.admin.count();

    if (input.page > Math.ceil(totalCount / input.limit)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Page not found',
      });
    }

    const admins = await prisma.admin.findMany({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: adminSortMapper(input.sort ? input.sort : { sortField: ESortField.CREATED_AT, sortOrder: ESortOrder.DESC }),
    });

    return {
      totalCount,
      admins,
      page: input.page,
    };
  }),
  byId: adminPrivateProcedure.input(getAdminDto).query(async ({ ctx: { prisma }, input }) => {
    const admin = await prisma.admin.findUnique({
      where: {
        id: input.admin_id,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!admin) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Admin not found',
      });
    }

    return admin;
  }),
  me: adminPrivateProcedure.input(getAdminDto).query(async ({ ctx: { req } }) => {
    return req.user;
  }),
  clients: clientRouter,
  employees: employeeRouter,
  owners: ownerRouter,
});
