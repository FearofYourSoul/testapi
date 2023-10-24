import { Admin, Client, Employee, Owner } from '@prisma/client';
import * as trpc from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { Request, Response } from 'express';

import { WSService } from '../services';
import { prisma } from '../utils/prisma';

export type TManagerAuthenticationRequest = IEmployeeAuthenticationRequest | IOwnerAuthenticationRequest;

export interface IClientAuthenticationRequest extends Request {
  user: Client;
}

export interface IOwnerAuthenticationRequest extends Request {
  user: Owner;
}

export interface IEmployeeAuthenticationRequest extends Request {
  user: Employee;
}

export interface IAdminAuthenticationRequest extends Request {
  user: Admin;
}

export type TRequest =
  | IClientAuthenticationRequest
  | IOwnerAuthenticationRequest
  | IAdminAuthenticationRequest
  | IEmployeeAuthenticationRequest;

export async function createContextInner(opts: trpcExpress.CreateExpressContextOptions, ioService: WSService) {
  const req: TRequest = opts.req as TRequest;
  const res: Response = opts.res;

  return { prisma, ioService, req, res };
}

export type TContextType = trpc.inferAsyncReturnType<typeof createContextInner>;

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export async function createContext(
  opts: trpcExpress.CreateExpressContextOptions,
  ioService: WSService
): Promise<TContextType> {
  return await createContextInner(opts, ioService);
}
