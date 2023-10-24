import { TRPCError } from '@trpc/server';
import { NextFunction, Request, Response } from 'express';

import { authService, EStrategy } from '../services/auth.service';
import { IAdminAuthenticationRequest, middleware, publicProcedure } from '../routes/createRouter';

function authenticate(req: Request, res: Response, next: NextFunction) {
  authService.passport.authenticate(EStrategy.ADMIN, function (err: Error, user: IAdminAuthenticationRequest['user'], info: any) {
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

const adminAuthMiddleWare = middleware(async ({ ctx: { req, res, ...opts }, next }) => {
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

  return next({
    ctx: {
      ...opts,
      res,
      req: {
        ...req,
        ip: req.ip,
        headers: req.headers,
        user: req.user as IAdminAuthenticationRequest['user'],
      },
    },
  });
});

export const adminPrivateProcedure = publicProcedure.use(adminAuthMiddleWare);
