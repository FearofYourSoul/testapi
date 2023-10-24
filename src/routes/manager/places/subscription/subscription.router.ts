import { TRPCError } from '@trpc/server';

import { router } from '../../../createRouter';
import { getSubscriptionDto } from './dto';
import { managerPrivateProcedure } from '../../../../privateProcedures';
import { logger } from '../../../../log';

export const subscriptionRouter = router({
  get: managerPrivateProcedure()
    .input(getSubscriptionDto)
    .query(async ({ ctx: { req, prisma }, input }) => {
      const subscription = await prisma.placeSubscription.findFirst({
        where: {
          place_id: input.placeId,
        },
        include: {
          SubscriptionPlan: true,
          SubscriptionDiscount: true,
        },
      });

      if (!subscription) {
        logger.info(`Attempted to get subscription info for non-existent place. place: ${input?.placeId}`);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Subscription with such place_id not found',
        });
      }

      return subscription;
    }),
});
