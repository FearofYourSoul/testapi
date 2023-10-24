import { TRPCError } from '@trpc/server';

import { router } from '../../../../createRouter';
import {
  createMenuCategoryDto,
  createMenuItemDto,
  deleteMenuCategoryDto,
  deleteMenuItemDto,
  getMenuCategoriesDto,
  getMenuItemsDto,
  updateMenuCategoryDto,
  updateMenuItemDto,
} from './dto';
import { managerPrivateProcedure } from '../../../../../privateProcedures';
import { ImageSupport, algoliaSearchService, imageMainService } from '../../../../../services';
import { prisma } from '../../../../../utils';
import { logger } from '../../../../../log';

const imageSupport = new ImageSupport(prisma);

export const menuSettingsRouter = router({
  categoriesList: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(getMenuCategoriesDto)
    .query(async ({ ctx: { prisma, whereCondition }, input }) => {
      const categories = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          PlaceMenuCategory: true,
        },
      });

      if (!categories) {
        logger.info(`Attempted to get menu categories list for non-existent place. place: ${input?.placeId}`);
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return categories.PlaceMenuCategory;
    }),
  createMenuCategory: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(createMenuCategoryDto)
    .mutation(async ({ ctx: { prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!place) {
        logger.info(`Attempted to create menu category list for non-existent place. place: ${input?.placeId}`);
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const existCategory = await prisma.placeMenuCategory.findFirst({
        where: { name: input.name, place_id: input.placeId },
        select: { id: true },
      });

      if (existCategory) {
        logger.info(`Attempted to create menu category that already exist. category: ${existCategory?.id}`);
        throw new TRPCError({ code: 'CONFLICT' });
      }

      const category = await prisma.placeMenuCategory.create({
        data: {
          name: input.name,
          place_id: input.placeId,
        },
        select: {
          id: true,
          name: true,
          place_id: true,
        },
      });

      const PlaceMenuCategory = await prisma.placeMenuCategory.findMany({
        where: {
          place_id: category.place_id,
        },
        select: {
          name: true,
        },
      });

      await algoliaSearchService.updatePlaces([{ id: category.place_id, PlaceMenuCategory }]);

      return category;
    }),
  updateMenuCategory: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(updateMenuCategoryDto)
    .mutation(async ({ ctx: { prisma, whereCondition }, input }) => {
      const category = await prisma.placeMenuCategory.update({
        where: {
          id: input.categoryId,
        },
        data: {
          name: input.name,
        },
        select: {
          id: true,
          name: true,
          place_id: true,
        },
      });

      const PlaceMenuCategory = await prisma.placeMenuCategory.findMany({
        where: {
          place_id: category.place_id,
        },
        select: {
          name: true,
        },
      });

      await algoliaSearchService.updatePlaces([{ id: category.place_id, PlaceMenuCategory }]);

      return category;
    }),
  deleteMenuCategory: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(deleteMenuCategoryDto)
    .mutation(async ({ ctx: { prisma }, input }) => {
      const items = await prisma.placeMenuItem.findMany({
        where: {
          place_menu_category_id: input.categoryId,
        },
        select: {
          id: true,
          Image: true,
        },
      });

      await prisma.placeMenuItem.deleteMany({
        where: {
          id: {
            in: items.map(({ id }) => id),
          },
        },
      });

      if (items.length) {
        await imageSupport.removeManyImages(
          items.reduce<Array<NonNullable<(typeof items)[0]['Image']>>>(
            (prev, data) => (data.Image?.base ? [...prev, data.Image] : prev),
            []
          )
        );
      }

      const category = await prisma.placeMenuCategory.delete({
        where: {
          id: input.categoryId,
        },
        select: {
          id: true,
          name: true,
          place_id: true,
        },
      });

      const PlaceMenuCategory = await prisma.placeMenuCategory.findMany({
        where: {
          place_id: category.place_id,
        },
        select: {
          name: true,
        },
      });

      await algoliaSearchService.updatePlaces([{ id: category.place_id, PlaceMenuCategory }]);

      return {
        ...category,
        id: input.categoryId,
      };
    }),
  menuItemsList: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(getMenuItemsDto)
    .query(async ({ ctx: { prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          PlaceMenuItems: {
            where: input.categories?.length
              ? {
                  place_menu_category_id: {
                    in: input.categories,
                  },
                }
              : undefined,
            include: {
              Image: {
                select: {
                  id: true,
                  large: true,
                  medium: true,
                  base: true,
                  small: true,
                },
              },
            },
          },
        },
      });

      if (!place) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return place.PlaceMenuItems;
    }),
  createMenuItem: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(createMenuItemDto)
    .mutation(async ({ ctx: { prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!place) {
        logger.info(`Attempted to create menu item for non-existent place. place: ${input?.placeId}`);
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const placeMenuItem = await prisma.placeMenuItem.create({
        data: {
          name: input.name,
          price: input.price,
          weight: input.weight,
          calories: input.calories,
          place_id: place.id,
          available_preorder: input.availablePreorder,
          place_menu_category_id: input.placeMenuCategoryId,
        },
        include: {
          Image: {
            select: {
              id: true,
              large: true,
              medium: true,
              base: true,
              small: true,
            },
          },
        },
      });

      if (input.image) {
        const imagesBuffers = (await imageMainService.validateAndTransform([input.image]))[0];
        const image = await imageSupport.uploadPlaceMenuItemImage({
          imagesBuffers,
          placeMenuItemId: placeMenuItem.id,
        });

        await prisma.placeMenuItem.update({
          where: { id: placeMenuItem.id },
          data: {
            image_id: image.id,
          },
          select: {
            id: true,
          },
        });

        placeMenuItem.Image = image;
      }

      return placeMenuItem;
    }),
  updateMenuItem: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(updateMenuItemDto)
    .mutation(async ({ ctx: { prisma }, input }) => {
      const placeMenuItem = await prisma.placeMenuItem.update({
        where: {
          id: input.menuItemId,
        },
        data: {
          available_preorder: input.availablePreorder,
          calories: input.calories,
          name: input.name,
          place_menu_category_id: input.placeMenuCategoryId,
          price: input.price,
          weight: input.weight,
        },
        include: {
          Image: {
            select: {
              id: true,
              large: true,
              medium: true,
              base: true,
              small: true,
            },
          },
        },
      });

      if (input.image) {
        const imagesBuffers = (await imageMainService.validateAndTransform([input.image]))[0];

        const image = await imageSupport.uploadPlaceMenuItemImage({
          imagesBuffers,
          placeMenuItemId: placeMenuItem.id,
        });

        if (placeMenuItem.Image) {
          await imageSupport.removeImage({ ...placeMenuItem.Image, base: null, small: null });
        }

        await prisma.placeMenuItem.update({
          where: { id: placeMenuItem.id },
          data: {
            image_id: image.id,
          },
          select: {
            id: true,
          },
        });

        placeMenuItem.Image = image;
      }

      return placeMenuItem;
    }),
  deleteMenuItem: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(deleteMenuItemDto)
    .mutation(async ({ ctx: { prisma }, input }) => {
      const item = await prisma.placeMenuItem.delete({
        where: {
          id: input.menuItemId,
        },
        select: {
          id: true,
          Image: true,
        },
      });

      if (item.Image) {
        await imageSupport.removeImage(item.Image);
      }

      return item;
    }),
});
