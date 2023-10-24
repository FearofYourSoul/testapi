import { TRPCError } from '@trpc/server';

import { router } from '../../../../../createRouter';
import { addTableImagesDto, deleteImageDto } from './dto';
import { imageMainService, ImageSupport, ESize } from '../../../../../../services';
import { managerPrivateProcedure } from '../../../../../../privateProcedures';
import { logger } from '../../../../../../log';

export const tablesImagesRouter = router({
  upload: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(addTableImagesDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const table = await prisma.placeTable.findFirst({
        where: {
          id: input.tableId,
          ...whereCondition.PlaceTable,
        },
        select: {
          id: true,
        },
      });
      const imageSupport = new ImageSupport(prisma);

      if (!table) {
        logger.info(
          `Attempted to upload table images for inexisting table. table: ${input.tableId}, manager: ${req.user.id}`
        );
        throw new TRPCError({ code: 'NOT_FOUND', message: 'no_place_found' });
      }

      if (!(await imageSupport.checkImageLimit({ max: 6, incoming: input.images.length, tableId: table.id }))) {
        logger.info(`Attempted to upload table images. Limit is exceeded. max: 6, manager: ${req.user.id}`);
        throw new TRPCError({
          code: 'FORBIDDEN',
          // Place has too many images
          message: 'image_limit',
        });
      }

      try {
        const imagesBuffers = await imageMainService.validateAndTransform(input.images);

        return await imageSupport.uploadTablesImages({
          imagesBuffers,
          table_id: table.id,
        });
      } catch (e) {
        if (e instanceof TRPCError) {
          throw e;
        }
        logger.error(`Attempted to upload table images. Invalid image buffer. table: ${input.tableId}. Error: ${e}`);
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
          PlaceTable: whereCondition.PlaceTable,
        },
        select: {
          id: true,
          [ESize.BASE]: true,
          [ESize.SMALL]: true,
          [ESize.MEDIUM]: true,
          [ESize.LARGE]: true,
        },
      });

      if (!image) {
        logger.info(`Attempted to delete table images for inexisting table. table: ${input.id}`);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'no_image_found' });
      }

      const imageSupport = new ImageSupport(prisma);
      await imageSupport.removeImage(image);

      return image;
    }),
});
