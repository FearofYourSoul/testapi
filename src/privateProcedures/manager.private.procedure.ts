import { AnyRootConfig, ProcedureParams, RootConfig, TRPCError } from '@trpc/server';
import { NextFunction, Request, Response } from 'express';

import { authService, EStrategy } from '../services/auth.service';
import {
  IEmployeeAuthenticationRequest,
  IOwnerAuthenticationRequest,
  middleware,
  publicProcedure,
} from '../routes/createRouter';
import { EEmployeeRole, Prisma, PrismaClient } from '@prisma/client';
import { WSService } from '../services';
import {
  createMiddlewareFactory,
  MiddlewareBuilder,
  MiddlewareFunction,
  MiddlewareResult,
} from '@trpc/server/dist/core/middleware';
import { TRouterInput } from '../routes';
import { z } from 'zod';

type IUser = IOwnerAuthenticationRequest['user'] | IEmployeeAuthenticationRequest['user'];
const roles = Object.values(EEmployeeRole);
type TRoles = (typeof roles)[number];

function authenticate(req: Request, res: Response, next: NextFunction) {
  authService.passport.authenticate(EStrategy.MANAGER, function (err: Error, user: IUser, info: any) {
    if (err) {
      return next(err);
    }
    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    req.user = user;
    return next();
  })(req, res, next);
}

const managerAuthMiddleWare = (roles?: Partial<Record<TRoles, boolean>>) =>
  middleware(async ({ ctx: { req, res, ...opts }, next, ...rest }) => {
    await new Promise((resolve, reject) => {
      authenticate(req, res, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve('');
      });
    });
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const role = 'role' in req.user ? req.user.role : 'owner';

    if (role !== 'owner' && (!roles || !roles[role])) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    const authReq = {
      ...req,
      ip: req.ip,
      headers: req.headers,
      user: req.user as IUser,
    };

    return next({
      ctx: {
        ...opts,
        res,
        req: authReq as IOwnerAuthenticationRequest | IEmployeeAuthenticationRequest,
      },
      ...rest,
    });
  });

export const managerPrivateProcedure = (roles?: Partial<Record<TRoles, boolean>>) => {
  const authMiddleware = managerAuthMiddleWare(roles);
  const privateProcedure = publicProcedure.use(authMiddleware);

  return privateProcedure.use(({ ctx, next }) => {
    const whereCondition: { PlaceTable: { PlaceSection: { Place: NonNullable<Pick<Prisma.PlaceWhereInput, 'OR'>> } } } =
      {
        PlaceTable: {
          PlaceSection: {
            Place: {
              OR: [
                { owner_id: ctx.req.user.id },
                {
                  Employee: {
                    some: {
                      employee_id: ctx.req.user.id,
                    },
                  },
                },
              ],
            },
          },
        },
      };

    return next({ ctx: { ...ctx, whereCondition } });
  });
};
