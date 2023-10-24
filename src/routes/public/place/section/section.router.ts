import { TRPCError } from '@trpc/server';

import { publicProcedure, router } from '../../../createRouter';
import { getSectionByIdDto, getSectionsDto } from './dto';
import { logger } from '../../../../log';

export const sectionRouter = router({
  list: publicProcedure.input(getSectionsDto).query(async ({ ctx: { prisma }, input }) => {
    const sections = await prisma.placeSection.findMany({
      where: {
        place_id: input.placeId,
      },
      select: {
        id: true,
        name: true,
        is_default: true,
      },
    });

    if (!sections.length) {
      logger.warn(`no sections found for place. place: ${input.placeId}`);
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Place sections not found',
      });
    }

    return {
      sections,
    };
  }),
  byId: publicProcedure.input(getSectionByIdDto).query(async ({ ctx: { prisma }, input }) => {
    const section = await prisma.placeSection.findUnique({
      where: { id: input.sectionId },
      select: {
        id: true,
        name: true,
        is_default: true,
        width: true,
        height: true,
        PlaceTable: {
          select: {
            id: true,
            angle: true,
            height: true,
            seats: true,
            shape: true,
            width: true,
            x: true,
            y: true,
          },
        },
        PlaceDecor: {
          select: {
            id: true,
            angle: true,
            type: true,
            height: true,
            width: true,
            x: true,
            y: true,
          },
        },
      },
    });

    if (!section) {
      logger.warn(`no section info found. section: ${input.sectionId}`);
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Section not found',
      });
    }

    return section;
  }),
});
