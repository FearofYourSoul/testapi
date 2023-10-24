import { TRPCError } from '@trpc/server';

import { router } from '../../../createRouter';
import { updateImagesDto, addPlaceBaseImageDto, addPlaceImagesDto, deleteImageDto } from './dto';
import { ESize, ImageSupport, imageMainService } from '../../../../services';
import { managerPrivateProcedure } from '../../../../privateProcedures';
import { logger } from '../../../../log';

export const placesImagesRouter = router({
  upload: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(addPlaceImagesDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
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
        logger.info(`Attempted to upload place images for inexisting place. place: ${input.placeId}`);
        throw new TRPCError({ code: 'NOT_FOUND', message: 'no_place_found' });
      }

      const imageSupport = new ImageSupport(prisma);

      if (!(await imageSupport.checkImageLimit({ max: 10, incoming: input.images.length, placeId: place.id }))) {
        logger.info(`Attempted to upload place images. limit is exceeded. max: 10, manager: ${req.user.id}`);
        throw new TRPCError({
          code: 'FORBIDDEN',
          // Place has too many images
          message: 'image_limit',
        });
      }

      try {
        const imagesBuffers = await imageMainService.validateAndTransform(input.images);
        return await imageSupport.uploadPlacesImages({ imagesBuffers, place_id: place.id });
      } catch (e) {
        if (e instanceof TRPCError) {
          throw e;
        }
        logger.error(`Attempted to upload place images. Invalid image buffer. place: ${input.placeId}. Error: ${e}`);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'invalid_image' });
      }
    }),
  base: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(addPlaceBaseImageDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
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
        logger.info(`Attempted to upload place base image for inexisting place. place: ${input.placeId}`);
        throw new TRPCError({ code: 'NOT_FOUND', message: 'no_place_found' });
      }
      const imageSupport = new ImageSupport(prisma);

      try {
        const imagesBuffers = await imageMainService.validateAndTransform([input.image]);

        const oldImage = await prisma.image.findFirst({
          where: { base_place_id: place.id },
          select: {
            id: true,
            [ESize.BASE]: true,
            [ESize.SMALL]: true,
            [ESize.MEDIUM]: true,
            [ESize.LARGE]: true,
          },
        });

        if (oldImage) {
          await imageSupport.removeImage(oldImage);
        }

        const result = (await imageSupport.uploadPlacesImages({ imagesBuffers, base_place_id: place.id }))[0];

        return { result };
      } catch (e) {
        if (e instanceof TRPCError) {
          throw e;
        }

        logger.error(`Attempted to upload place images. Invalid image buffer. place: ${input.placeId}, Error: ${e}`);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'invalid_image' });
      }
    }),
  delete: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(deleteImageDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const image = await prisma.image.findFirst({
        where: {
          id: input.id,
          Place: whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
          [ESize.BASE]: true,
          [ESize.SMALL]: true,
          [ESize.MEDIUM]: true,
          [ESize.LARGE]: true,
        },
      });
      const imageSupport = new ImageSupport(prisma);

      if (!image) {
        logger.info(`Attempted to delete place image that doesn't exist. image: ${input.id}`);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'no_image_found' });
      }

      await imageSupport.removeImage(image);

      return image;
    }),
  update: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(updateImagesDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const imageSupport = new ImageSupport(prisma);

      try {
        let addedImages;
        if (input.images.added?.length) {
          if (
            !(await imageSupport.checkImageLimit({
              max: 10,
              incoming: input.images.added.length,
              placeId: input.placeId,
              shouldBeDeleted: input.images.deleted?.length,
            }))
          ) {
            logger.info(`Attempted to update place images. limit is exceeded. max: 10, manager: ${req.user.id}`);
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'image_limit',
            });
          }
          const imagesBuffers = await imageMainService.validateAndTransform(input.images.added);
          addedImages = await imageSupport.uploadPlacesImages({ imagesBuffers, place_id: input.placeId });
        }

        if (input.images.deleted?.length) {
          const deletedImages = await prisma.image.findMany({
            where: {
              id: {
                in: input.images.deleted,
              },
              Place: whereCondition.PlaceTable.PlaceSection.Place,
            },
            select: {
              id: true,
              [ESize.BASE]: true,
              [ESize.SMALL]: true,
              [ESize.MEDIUM]: true,
              [ESize.LARGE]: true,
            },
          });

          if (!deletedImages.length) {
            logger.info(`Attempted to update place base image that doesn't exist`);
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'no_images_found' });
          }

          await imageSupport.removeManyImages(deletedImages);
        }

        return addedImages;
      } catch (e) {
        if (e instanceof TRPCError) {
          throw e;
        }
        logger.error(`Attempted to update place images. Invalid image buffer. place: ${input.placeId}, Error: ${e}`);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'invalid_image' });
      }
    }),
});
