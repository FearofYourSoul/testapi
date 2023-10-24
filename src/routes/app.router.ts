import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

import { adminRouter } from './admin';
import { authRouter } from './auth';
import { clientRouter } from './client';
import { publicRouter } from './public';
import { managerRouter } from './manager';
import { router } from './createRouter';

export const appRouter = router({
  admin: adminRouter,
  auth: authRouter,
  clients: clientRouter,
  public: publicRouter,
  manager: managerRouter,
})

export type TAppRouter = typeof appRouter;

export type TRouterInput = inferRouterInputs<TAppRouter>;
export type TRouterOutput = inferRouterOutputs<TAppRouter>;