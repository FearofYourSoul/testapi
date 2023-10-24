import { TRPCError } from '@trpc/server';

import { managerPrivateProcedure } from '../../../../../privateProcedures';
import { router } from '../../../../createRouter';
import {
  createTableDto,
  deleteTableDto,
  getTableByIdDto,
  getTablesDto,
  makeTableActiveDto,
  updateTableDto,
} from './dto';
import { tablesImagesRouter } from './image';
import { logger } from '../../../../../log';

export const tableRouter = router({
  list: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(getTablesDto)
    .query(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const tables = await prisma.placeTable.findMany({
        where: { place_section_id: input.sectionId, deleted_at: null, ...whereCondition.PlaceTable },
        select: {
          id: true,
          name: true,
          angle: true,
          height: true,
          seats: true,
          shape: true,
          width: true,
          isActive: true,
          place_section_id: true,
          x: true,
          y: true,
        },
      });

      return tables;
    }),
  byId: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(getTableByIdDto)
    .query(async ({ ctx: { prisma, whereCondition }, input }) => {
      const table = await prisma.placeTable.findFirst({
        where: { id: input.tableId, PlaceSection: whereCondition.PlaceTable.PlaceSection },
        select: {
          id: true,
          isActive: true,
          available_for_online: true,
          name: true,
          seats: true,
          angle: true,
          height: true,
          shape: true,
          width: true,
          x: true,
          y: true,
          iiko_table_name: true,
          external_id: true,
          Image: {
            select: {
              id: true,
              small: true,
              medium: true,
              large: true,
              base: true,
            },
          },
          PlaceSection: {
            select: {
              name: true,
              id: true,
            },
          },
          place_section_id: true,
        },
      });

      if (!table) {
        logger.info(`Attempted to get table that doesn't exist. table: ${input.tableId}`);
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      return table;
    }),
  create: managerPrivateProcedure({
    manager: true,
  })
    .input(createTableDto)
    .mutation(async ({ ctx: { prisma }, input }) => {
      const table = await prisma.placeTable.create({
        data: {
          name: input.name,
          height: input.height,
          width: input.width,
          x: input.x,
          y: input.y,
          seats: input.seats,
          external_id: input.externalId,
          place_section_id: input.sectionId,
          angle: input.angle,
          shape: input.shape,
        },
        select: {
          id: true,
          angle: true,
          height: true,
          seats: true,
          shape: true,
          width: true,
          x: true,
          y: true,
          iiko_table_name: true,
          external_id: true,
          isActive: true,
          name: true,
          Image: {
            select: {
              id: true,
              small: true,
              medium: true,
              large: true,
              base: true,
            },
          },
          place_section_id: true,
        },
      });

      return table;
    }),
  update: managerPrivateProcedure({
    manager: true,
  })
    .input(updateTableDto)
    .mutation(async ({ ctx: { prisma, whereCondition }, input }) => {
      const table = await prisma.placeTable.update({
        where: {
          id: input.id,
          ...whereCondition.PlaceTable,
        },
        data: {
          name: input.name,
          height: input.height,
          width: input.width,
          x: input.x,
          y: input.y,
          seats: input.seats,
          external_id: input.externalId,
          place_section_id: input.sectionId,
          angle: input.angle,
          shape: input.shape,
        },
        select: {
          id: true,
          angle: true,
          height: true,
          seats: true,
          shape: true,
          width: true,
          x: true,
          y: true,
          iiko_table_name: true,
          external_id: true,
          isActive: true,
          name: true,
          Image: {
            select: {
              id: true,
              small: true,
              medium: true,
              large: true,
              base: true,
            },
          },
          place_section_id: true,
        },
      });

      return table;
    }),
  delete: managerPrivateProcedure({
    manager: true,
  })
    .input(deleteTableDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      await prisma.placeTable.delete({
        where: {
          id: input.tableId,
          ...whereCondition.PlaceTable,
        },
      });
    }),
  activate: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(makeTableActiveDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      // TODO add check why we can make it active
      await prisma.placeTable.update({
        where: {
          id: input.tableId,
          ...whereCondition.PlaceTable,
        },
        data: {
          isActive: true,
        },
      });
    }),
  deactivate: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(makeTableActiveDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      // TODO add check why we can deactivate
      await prisma.placeTable.update({
        where: {
          id: input.tableId,
          ...whereCondition.PlaceTable,
        },
        data: {
          isActive: false,
        },
      });
    }),
  images: tablesImagesRouter,
});
