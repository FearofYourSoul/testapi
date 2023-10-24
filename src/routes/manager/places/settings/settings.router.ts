import { TRPCError } from '@trpc/server';

import { managerPrivateProcedure } from '../../../../privateProcedures';
import { router } from '../../../createRouter';
import { updateMainSettingsDto, updateSectionSettingsDto } from './dto';
import { settingsReserveRouter } from './reserve';
import { sectionSelect } from '../section';
import { menuSettingsRouter } from './menu';
import { settingsDepositRouter } from './deposit';
import { algoliaSearchService } from '../../../../services';
import { logger } from '../../../../log';

export const settingsRouter = router({
  updateMain: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(updateMainSettingsDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
          Address: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!place) {
        logger.info(`Attempted to update settings info for non-existent place. place: ${input?.placeId}`);
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const updatedPlace = await prisma.place.update({
        where: {
          id: place.id,
        },
        data: {
          name: input.name,
          phone_number: input.phoneNumber,
          Address: {
            upsert: {
              update: {
                postal_code: input.postalCode,
                country: input.country,
                city: input.city,
                region: input.region,
                address_line1: input.addressLine,
              },
              create: {
                address_line1: input.addressLine || `${input.city}, ${input.country}`,
                postal_code: input.postalCode,
                country: input.country,
                city: input.city || '',
                region: input.region,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          phone_number: true,
          Address: {
            select: {
              city: true,
              address_line1: true,
              address_line2: true,
              postal_code: true,
              country: true,
              region: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      });

      await algoliaSearchService.updatePlaces([updatedPlace]);

      return updatedPlace;
    }),
  section: managerPrivateProcedure({ manager: true })
    .input(updateSectionSettingsDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const section = await prisma.placeSection.findFirst({
        where: {
          id: input.sectionId,
          Place: whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!section) {
        logger.info(`Attempted to update section info for non-existent section. section: ${input?.placeId}`);
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const updatedSection = await prisma.placeSection.update({
        where: {
          id: section.id,
        },
        data: {
          name: input.name,
          is_summer_terrace: input.isTerrace,
          is_visible: input.isVisible,
          WorkingHours:
            input.workingHours?.isSame === true
              ? {
                  deleteMany: [
                    {
                      place_section_id: section.id,
                    },
                  ],
                }
              : input.workingHours && 'hours' in input.workingHours && input.workingHours?.hours.length === 7
              ? {
                  createMany: {
                    data: input.workingHours.hours,
                    skipDuplicates: true,
                  },
                }
              : undefined,
        },
        select: sectionSelect,
      });

      const PlaceSection = await prisma.placeSection.findMany({
        where: {
          place_id: updatedSection.place_id,
        },
        select: {
          name: true,
        },
      });
      await algoliaSearchService.updatePlaces([{ id: updatedSection.place_id, PlaceSection }]);

      return updatedSection;
    }),
  reserves: settingsReserveRouter,
  menu: menuSettingsRouter,
  deposits: settingsDepositRouter,
});
