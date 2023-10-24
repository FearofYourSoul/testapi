import { TRPCError } from '@trpc/server';

import { middleware, publicProcedure } from '../../../createRouter';
import { logger } from '../../../../log';

const mobileAuthMiddleWare = middleware(async ({ ctx, next }) => {
  if (!ctx.req.headers['x-api-key'] || ctx.req.headers['x-api-key'] !== process.env.X_API_KEY) {
    logger.warn(
      `mobile x-api-key doesn't exist or wrong for user: ${ctx.req.user?.email}. server X_API_KEY: ${process.env.X_API_KEY}, mobile x-api-key ${ctx.req.headers['x-api-key']}`
    );
    throw new TRPCError({ code: 'FORBIDDEN' });
  }

  return next({ ctx });
});

export const mobileAuthProcedure = publicProcedure.use(mobileAuthMiddleWare);
