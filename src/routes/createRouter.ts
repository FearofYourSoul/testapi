import { initTRPC } from '@trpc/server';

import { TContextType } from './createContext';
export * from './createContext';

export const t = initTRPC.context<TContextType>().create({});

export const { procedure: publicProcedure, router, middleware } = t;

// export function createManagerRouter(props?: IManagerRouterProps) {
//   return trpc.router<TContextType>().middleware(({ ctx, next }) => {
//     const res = {
//       ctx: {
//         ...ctx,
//         req: ctx.req as TManagerAuthenticationRequest,
//       },
//     };
//     if (!props || !('role' in ctx.req.user)) {
//       return next(res);
//     }

//     const { roles, forbidMutationsFor } = props;

//     if (ctx.req.method === 'POST' && forbidMutationsFor?.includes(ctx.req.user.role)) {
//       throw new TRPCError({
//         code: 'UNAUTHORIZED',
//       });
//     }

//     if (roles?.includes(ctx.req.user.role) || !roles) {
//       return next(res);
//     }

//     throw new TRPCError({
//       code: 'UNAUTHORIZED',
//     });
//   });
// }
