import { TRPCError } from '@trpc/server';

import { router } from '../../../createRouter';
import {
  TWorkingHours,
  createSectionDto,
  deleteSectionDto,
  getSectionDto,
  setDefaultDto,
  updateSectionDto,
} from './dto';
import { tableRouter } from './table';
import {
  EFolders,
  ESize,
  ImageSupport,
  TImage,
  TUploadResponse,
  algoliaSearchService,
  imageMainService,
} from '../../../../services';
import { managerPrivateProcedure } from '../../../../privateProcedures';
import { logger } from '../../../../log';

export const sectionSelect = {
  id: true,
  name: true,
  height: true,
  width: true,
  place_id: true,
  is_default: true,
  external_id: true,
  WorkingHours: {
    select: {
      id: true,
      day: true,
      is_working_all_day: true,
      is_day_off: true,
      start_time: true,
      end_time: true,
    },
  },
  PlaceTable: {
    where: { deleted_at: null },
    include: {
      Image: true,
    },
  },
  PlaceDecor: {
    where: { deleted_at: null },
  },
  is_visible: true,
  is_summer_terrace: true,
};

export const sectionRouter = router({
  create: managerPrivateProcedure({
    manager: true,
  })
    .input(createSectionDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
          PlaceSection: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!place) {
        logger.info(`Attempted to create section for inexisting place. place: ${input?.placeId}`);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'not_found',
        });
      }

      const section = await prisma.placeSection.create({
        data: {
          name: input.name,
          place_id: place.id,
          is_summer_terrace: input.isTerrace,
          is_default: place.PlaceSection.length === 0,
          is_visible: input.isVisible,
          WorkingHours: input.workingHours.isSame
            ? undefined
            : {
                createMany: {
                  data: (input.workingHours as TWorkingHours).hours,
                  skipDuplicates: true,
                },
              },
        },
        select: sectionSelect,
      });

      const PlaceSection = await prisma.placeSection.findMany({
        where: {
          place_id: section.place_id,
        },
        select: {
          name: true,
        },
      });
      await algoliaSearchService.updatePlaces([{ id: section.place_id, PlaceSection }]);

      return section;
    }),
  byId: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(getSectionDto)
    .query(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const section = await prisma.placeSection.findFirst({
        where: {
          id: input.sectionId,
          ...whereCondition.PlaceTable.PlaceSection,
        },
        select: sectionSelect,
      });

      if (!section) {
        logger.debug(`Attempted to get section that doesn't exist. section: ${input?.sectionId}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'not_found',
        });
      }

      return section;
    }),
  setDefault: managerPrivateProcedure({
    manager: true,
  })
    .input(setDefaultDto)
    .mutation(async ({ ctx: { prisma, whereCondition }, input }) => {
      const section = await prisma.placeSection.findFirst({
        where: {
          id: input.sectionId,
          ...whereCondition.PlaceTable.PlaceSection,
        },
        select: {
          id: true,
          place_id: true,
        },
      });

      if (!section) {
        logger.info(`Attempted to set default section that doesn't exist. section: ${input?.sectionId}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'not_found',
        });
      }

      const [_, result] = await prisma.$transaction([
        prisma.placeSection.updateMany({
          where: {
            place_id: section.place_id,
            is_default: true,
          },
          data: { is_default: false },
        }),
        prisma.placeSection.update({
          where: { id: section.id },
          data: { is_default: true },
          select: { id: true },
        }),
      ]);

      return result;
    }),
  update: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(updateSectionDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const imageSupport = new ImageSupport(prisma);

      const tables = await Promise.all(
        input.tables?.map(async (table) => {
          let addedImages: Array<TUploadResponse<Array<ESize>>> = [];
          // const a = addedImages[0]?.base.
          let deletedImages: Array<string> = [];

          if (table.images?.deletedImages && table.images.deletedImages.length !== 0) {
            const tables = await prisma.image.findMany({
              where: {
                PlaceTable: whereCondition.PlaceTable,
                id: {
                  in: table.images.deletedImages,
                },
              },
              select: {
                id: true,
              },
            });

            deletedImages = tables.map(({ id }) => id);
          }

          if (table.images?.addedImages && table.images.addedImages.length !== 0) {
            if (
              !(await imageSupport.checkImageLimit({
                max: 10,
                incoming: table.images.addedImages.length,
                tableId: table.id,
                shouldBeDeleted: deletedImages.length,
              }))
            ) {
              logger.info(
                `Attempted to add section images. Image limit: max 10. current count: ${table.images.addedImages.length}`
              );
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'image_limit',
              });
            }
            const imagesBuffers = await imageMainService.validateAndTransform(table.images.addedImages);
            try {
              addedImages = await Promise.all(
                imagesBuffers.map((buffer) => {
                  return imageMainService.upload(buffer, { key: EFolders.TABLES });
                })
              );
            } catch (e) {
              logger.error(`Attempted to add section images. Invalid image list. Error: ${e}`);
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'invalid_image',
              });
            }
          }

          return {
            ...table,
            addedImages,
            deletedImages,
          };
        }) || []
      );
      const section = await prisma.placeSection.findFirst({
        where: {
          id: input.sectionId,
          ...whereCondition.PlaceTable.PlaceSection,
        },
        select: {
          id: true,
          place_id: true,
        },
      });

      if (!section) {
        logger.info(`Attempted to update section that doesn't exist. section: ${input?.sectionId}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'not_found',
        });
      }

      if (input.decor) {
        const deleteDecor = prisma.placeDecor.updateMany({
          where: {
            place_section_id: section.id,
            id: {
              notIn: input.decor.map((decor) => decor.id),
            },
          },
          data: {
            deleted_at: new Date(),
          },
        });

        const upsertDecor = input.decor.map((decor) => {
          return prisma.placeDecor.upsert({
            where: {
              id: decor.id,
            },
            create: {
              height: decor.height || 40,
              width: decor.width || 40,
              x: decor.x || 0,
              y: decor.y || 0,
              angle: decor.angle || 0,
              type: decor.type || 'RECTANGLE',
              PlaceSection: {
                connect: {
                  id: input.sectionId,
                },
              },
            },
            update: {
              ...decor,
            },
          });
        });

        await prisma.$transaction([deleteDecor, ...upsertDecor]);
      }

      if (tables.length) {
        const deleteTables = prisma.placeTable.updateMany({
          where: {
            place_section_id: input.sectionId,
            id: {
              notIn: tables.map((table) => table.id),
            },
          },
          data: {
            deleted_at: new Date(),
          },
        });

        const upsertTables = tables.map((table) => {
          const { addedImages, deletedImages, images, ...rest } = table;
          return prisma.placeTable.upsert({
            where: {
              id: rest.id,
            },
            create: {
              height: rest.height || 40,
              name: rest.name || 'Table',
              seats: rest.seats || 2,
              width: rest.width || 40,
              x: rest.x || 0,
              y: rest.y || 0,
              isActive: rest.isActive,
              available_for_online: rest.available_for_online,
              angle: rest.angle || 0,
              shape: rest.shape || 'RECTANGLE',
              external_id: rest.externalId || '',
              PlaceSection: {
                connect: {
                  id: input.sectionId,
                },
              },
              Image: {
                createMany: {
                  data: table.addedImages.map((image) => ({
                    [ESize.SMALL]: image[ESize.SMALL].key,
                    [ESize.MEDIUM]: image[ESize.MEDIUM].key,
                    [ESize.LARGE]: image[ESize.LARGE].key,
                    [ESize.BASE]: image[ESize.BASE].key,
                  })),
                },
              },
            },
            update: {
              ...rest,
              Image: {
                createMany: {
                  data: addedImages.map((image) => ({
                    [ESize.SMALL]: image[ESize.SMALL].key,
                    [ESize.MEDIUM]: image[ESize.MEDIUM].key,
                    [ESize.LARGE]: image[ESize.LARGE].key,
                    [ESize.BASE]: image[ESize.BASE].key,
                  })),
                },
                deleteMany: deletedImages.map((id) => ({ id })),
              },
            },
          });
        });

        try {
          await prisma.$transaction([deleteTables, ...upsertTables]);
        } catch (e) {
          logger.warn(`Attempted to update tables. Trpc error: ${e}`);
          throw e;
        }
      }

      const updatedSection = await prisma.placeSection.update({
        where: {
          id: section.id,
        },
        data: {
          height: input.height,
          width: input.width,
          is_default: input.isDefault,
          external_id: input.externalId,
        },
        select: sectionSelect,
      });

      return updatedSection;
    }),
  delete: managerPrivateProcedure({
    manager: true,
  })
    .input(deleteSectionDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const placeSection = await prisma.placeSection.findFirst({
        where: {
          id: input.sectionId,
          ...whereCondition.PlaceTable.PlaceSection,
        },
        select: {
          id: true,
          place_id: true,
          PlaceTable: {
            select: {
              Image: {
                select: {
                  id: true,
                  small: true,
                  medium: true,
                  large: true,
                  base: true,
                },
              },
            },
          },
        },
      });

      if (!placeSection) {
        logger.info(`Attempted to delete section that doesn't exist. section: ${input?.sectionId}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'not_found',
        });
      }

      const images = placeSection.PlaceTable.reduce<Array<TImage>>((acc, table) => {
        acc.push(...table.Image);

        return acc;
      }, []);

      if (images.length !== 0) {
        const supportImageService = new ImageSupport(prisma);

        await supportImageService.removeManyImages(images);
      }

      const removedSection = await prisma.placeSection.delete({
        where: {
          id: placeSection.id,
        },
        select: sectionSelect,
      });

      let newDefault;

      if (removedSection.is_default) {
        const newDefaultSection = await prisma.placeSection.findFirst({
          where: { place_id: placeSection.place_id },
          select: { id: true },
        });
        if (newDefaultSection) {
          newDefault = newDefaultSection.id;
          await prisma.placeSection.update({
            where: {
              id: newDefaultSection.id,
            },
            data: { is_default: true },
          });
        }
      }

      return { removedSection, newDefault };
    }),
  tables: tableRouter,
});
