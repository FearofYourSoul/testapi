import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../../../createRouter';
import { getMenuItemsList, getMenuList, isPlaceHaveMenuDto } from './dto';
import { logger } from '../../../../log';

export const menuRouter = router({
  categoriesList: publicProcedure.input(getMenuList).query(async ({ input, ctx: { prisma } }) => {
    const place = await prisma.place.findFirst({
      where: {
        id: input.placeId,
      },
      select: {
        PlaceMenuCategory: {
          where: {
            OR: [
              {
                name: {
                  contains: input.search ? input.search : undefined,
                },
              },
              {
                PlaceMenuItem: {
                  some: {
                    name: {
                      contains: input.search ? input.search : undefined,
                    },
                  },
                },
              },
            ],
            PlaceMenuItem: {
              some: {
                available_preorder: true,
              },
            },
          },
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!place) {
      logger.error(`attempted to get menu categories info for inexisting place. place: ${input.placeId}`)
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    return place.PlaceMenuCategory;
  }),
  isPlaceHaveMenu: publicProcedure.input(isPlaceHaveMenuDto).query(async ({ ctx: { req, prisma }, input }) => {
    const placeCategoriesCount = await prisma.placeMenuCategory.count({
      where: { place_id: input.placeId },
    });
    const placeMenuItemsCount = await prisma.placeMenuItem.count({
      where: { place_id: input.placeId },
    });

    return {
      placeId: input.placeId,
      isHave: placeCategoriesCount > 0 && placeMenuItemsCount > 0,
    };
  }),
  menuItemsList: publicProcedure.input(getMenuItemsList).query(async ({ input, ctx: { prisma } }) => {
    const place = await prisma.place.findFirst({
      where: {
        id: input.placeId,
      },
      select: {
        PlaceMenuItems: {
          where: {
            available_preorder: true,
            name: {
              contains: input.search ? input.search : undefined,
            },
            PlaceMenuCategory: input.categories?.length
              ? {
                  id: {
                    in: input.categories,
                  },
                }
              : undefined,
          },
          include: {
            Image: {
              select: {
                id: true,
                medium: true,
              },
            },
          },
        },
      },
    });

    if (!place) {
      logger.error(`attempted to get menu info for inexisting place. place: ${input.placeId}`)
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    return place.PlaceMenuItems;
  }),
});
