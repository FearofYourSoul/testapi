import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import dayjs from 'dayjs';

import { router } from '../../createRouter';
import { addressRouter } from './address';
import {
  createPlaceDto,
  deletePlaceDto,
  excludePlaceKeysCheck,
  getPlaceDto,
  getPlacesDto,
  publishPlaceDto,
  updatePlaceDto,
} from './dto';
import { placesImagesRouter } from './image';
import { sectionRouter } from './section';
import { workingHoursRouter } from './workingHours';
import { subscriptionRouter } from './subscription';
import { settingsRouter } from './settings';
import { managerPrivateProcedure } from '../../../privateProcedures';
import { algoliaSearchService } from '../../../services';
import { logger } from '../../../log';

export const placeRouter = router({
  list: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(getPlacesDto)
    .query(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const where: Prisma.PlaceWhereInput = {
        ...whereCondition.PlaceTable.PlaceSection.Place,
        name: {
          contains: input.search,
          mode: 'insensitive',
        },
        CategoryPlace:
          input.category && input.category.length
            ? {
                some: {
                  Category: {
                    name: {
                      in: input.category,
                    },
                  },
                },
              }
            : undefined,
        expensiveness: {
          in: input.expensiveness,
        },
      };

      const totalCount = await prisma.place.count({ where });
      const places = await prisma.place.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          id: true,
          logo_url: true,
          name: true,
          is_published: true,
          iiko_Place_id: true,
          PlaceSubscription: {
            select: {
              start_time: true,
              end_time: true,
              SubscriptionDiscount: {
                select: {
                  amount: true,
                  start: true,
                  end: true,
                },
              },
              SubscriptionPlan: {
                select: {
                  format: true,
                  id: true,
                  name: true,
                },
              },
            },
          },
          Address: {
            select: {
              city: true,
              address_line1: true,
              address_line2: true,
              postal_code: true,
              country: true,
            },
          },
          BaseImage: {
            select: {
              id: true,
              small: true,
              medium: true,
              large: true,
              base: true,
            },
          },
        },
        orderBy: {
          id: 'asc',
        },
      });

      let nextCursor: typeof input.cursor | undefined;
      if (places.length > input.limit) {
        const nextItem = places.pop();
        nextCursor = nextItem?.id;
      }

      return {
        totalCount,
        places,
        nextCursor,
      };
    }),
  byId: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(getPlaceDto)
    .query(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
          logo_url: true,
          name: true,
          expensiveness: true,
          description: true,
          iiko_Place_id: true,
          is_published: true,
          expiration_time: true,
          phone_number: true,
          PlaceKitchen: {
            select: {
              id: true,
              Kitchen: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          ClientRating: {
            select: {
              id: true,
              name: true,
            },
          },
          PlaceSection: {
            select: {
              id: true,
              is_default: true,
              name: true,
              width: true,
              height: true,
            },
          },
          Address: {
            select: {
              city: true,
              address_line1: true,
              address_line2: true,
              postal_code: true,
              country: true,
              region: true,
            },
          },
          BaseImage: {
            select: {
              id: true,
              small: true,
              medium: true,
              large: true,
              base: true,
            },
          },
          Image: {
            select: {
              id: true,
              small: true,
              medium: true,
              large: true,
              base: true,
            },
          },
          WorkingHours: {
            select: {
              day: true,
              end_time: true,
              start_time: true,
              is_day_off: true,
              is_working_all_day: true,
            },
          },
          PlaceSubscription: {
            include: {
              SubscriptionDiscount: {
                select: {
                  discount: true,
                  start: true,
                  end: true,
                },
              },
              SubscriptionPlan: {
                select: {
                  id: true,
                  format: true,
                  name: true,
                },
              },
            },
          },
          CategoryPlace: {
            select: {
              Category: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
          ReservesSettings: true,
        },
      });

      if (!place) {
        logger.info(`Attempted to get place that doesn't exist. place: ${input?.placeId}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Place not found',
        });
      }

      return place;
    }),
  create: managerPrivateProcedure()
    .input(createPlaceDto)
    .mutation(async ({ ctx: { req, prisma }, input }) => {
      const categoryData = await prisma.category.findMany({
        where: {
          name: {
            in: input.category || [],
          },
        },
        select: {
          id: true,
        },
      });

      if (!categoryData.length && input.category) {
        logger.warn(
          `Unable to create place. Category with these names not found: ${input.category.join(', ')}. manager: ${
            req.user.id
          }`
        );
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Category with such name not found',
        });
      }

      const kitchenData = await prisma.kitchen.findMany({
        where: {
          name: {
            in: input.kitchen || [],
          },
        },
        select: {
          id: true,
        },
      });

      if (!kitchenData.length && input.kitchen) {
        logger.warn(
          `Unable to create place. Kitchen with these names not found: ${input.kitchen.join(', ')}. manager: ${
            req.user.id
          }`
        );
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Kitchen with such name not found',
        });
      }

      const reservesSettingsId = await prisma.reservesSettings.create({
        data: {},
        select: {
          id: true,
        },
      });
      const plan = await prisma.subscriptionPlan.findFirst({
        where: {
          name: 'FREE',
        },
      });

      const place = await prisma.place.create({
        data: {
          name: input.name,
          expensiveness: input.expensiveness || 'CHEAP',
          logo_url: input.logoUrl,
          PlaceKitchen: {
            createMany: {
              data: kitchenData.map(({ id }) => ({ kitchen_id: id })),
            },
          },
          description: input.description,
          PlaceSubscription: {
            create: {
              start_time: dayjs().toDate(),
              end_time: dayjs().add(1, 'month').toDate(),
              status: 'ACTIVE',
              SubscriptionPlan: {
                connect: {
                  id: plan!.id,
                },
              },
            },
          },
          CategoryPlace: {
            createMany: {
              data: categoryData.map(({ id }) => ({ category_id: id })),
            },
          },
          ReservesSettings: {
            connect: {
              id: reservesSettingsId.id,
            },
          },
          IikoPlace: {
            connect: {
              id: input.iikoKey,
            },
          },
          Owner: {
            connect: {
              id: req.user.id,
            },
          },
        },
      });

      return place;
    }),
  update: managerPrivateProcedure({
    manager: true,
  })
    .input(updatePlaceDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const categoryData = await prisma.category.findMany({
        where: {
          name: {
            in: input.category,
          },
        },
        select: {
          id: true,
        },
      });

      if (!categoryData.length) {
        logger.warn(
          `Unable to update place. Category with these names not found: ${input.category?.join(', ')}. manager: ${
            req.user.id
          }`
        );
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Category with such name not found',
        });
      }

      const kitchenData = await prisma.kitchen.findMany({
        where: {
          name: {
            in: input.kitchen,
          },
        },
        select: {
          id: true,
        },
      });

      if (!kitchenData.length) {
        logger.warn(
          `Unable to update place. Kitchen with these names not found: ${input.kitchen?.join(', ')}. manager: ${
            req.user.id
          }`
        );
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Kitchen with such name not found',
        });
      }

      const currentPlace = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!currentPlace) {
        logger.info(
          `Unable to update place info for non-existent place. place: ${input.placeId}. manager: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Place with such id not found',
        });
      }

      const place = await prisma.place.update({
        where: {
          id: currentPlace.id,
        },
        data: {
          name: input.name,
          expensiveness: input.expensiveness || 'CHEAP',
          logo_url: input.logoUrl,
          PlaceKitchen: {
            createMany: {
              data: kitchenData.map(({ id }) => ({ kitchen_id: id })),
            },
          },
          description: input.description,
          CategoryPlace: {
            createMany: {
              data: categoryData.map(({ id }) => ({ category_id: id })),
            },
          },
          iiko_Place_id: input.iikoKey,
          owner_id: req.user.id,
        },
      });

      return place;
    }),
  delete: managerPrivateProcedure()
    .input(deletePlaceDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const currentPlace = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!currentPlace) {
        logger.info(`Unable to delete place that doesn't exist. place: ${input.placeId}. manager: ${req.user.id}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Place with such id not found',
        });
      }

      await prisma.place.delete({ where: { id: currentPlace.id } });
    }),
  publish: managerPrivateProcedure()
    .input(publishPlaceDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const currentPlace = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
          Address: true,
          CategoryPlace: true,
          expensiveness: true,
          description: true,
          iiko_Place_id: true,
          Image: true,
          name: true,
          logo_url: true,
          PlaceKitchen: true,
          PlaceSection: true,
          PlaceSubscription: true,
          WorkingHours: true,
        },
      });

      if (!currentPlace) {
        logger.info(`Unable to publish place that doesn't exist. place: ${input.placeId}. manager: ${req.user.id}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Place with such id not found',
        });
      }

      const isValid = Object.entries(currentPlace).every(([k, value]) => {
        const key = k as keyof typeof currentPlace;

        if (excludePlaceKeysCheck.includes(key)) {
          return true;
        }

        if (key === 'WorkingHours') {
          return currentPlace[key]?.length === 7;
        }

        return Array.isArray(value) ? !!value.length : !!value;
      });

      if (!isValid) {
        logger.info(`not enough data to publish place. place: ${input.placeId}. manager: ${req.user.id}`);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Not enough data to publish',
        });
      }

      // TODO add subscription and payment check
      const publishedPlace = await prisma.place.update({
        where: { id: currentPlace.id },
        data: {
          is_published: true,
        },
        include: {
          Address: true,
          PlaceKitchen: {
            include: {
              Kitchen: true,
            },
          },
          CategoryPlace: {
            include: {
              Category: true,
            },
          },
          PlaceSection: true,
          PlaceMenuCategory: {
            select: {
              name: true,
            },
          },
          PlaceMenuItems: {
            select: {
              name: true,
            },
          },
        },
      });
      await algoliaSearchService.addPlaces([publishedPlace]);
    }),
  unpublish: managerPrivateProcedure()
    .input(publishPlaceDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const currentPlace = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!currentPlace) {
        logger.info(`Unable to unpublish place that doesn't exist. place: ${input.placeId}. manager: ${req.user.id}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Place with such id not found',
        });
      }

      await prisma.place.update({
        where: { id: currentPlace.id },
        data: {
          is_published: false,
        },
      });
    }),
  address: addressRouter,
  images: placesImagesRouter,
  sections: sectionRouter,
  settings: settingsRouter,
  subscription: subscriptionRouter,
  workingHours: workingHoursRouter,
});
