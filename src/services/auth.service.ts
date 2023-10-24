import passport, { PassportStatic } from 'passport';
import { ExtractJwt, Strategy as JWTStrategy } from 'passport-jwt';
import { TRPCError } from '@trpc/server';
import { sign, verify, decode } from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { getExpiresIn } from '../utils/getTime';

import { prisma } from '../utils/prisma';
import { EEmployeeRole } from '@prisma/client';

export enum EStrategy {
  ADMIN = 'admin-jwt-access',
  CLIENT = 'client-jwt-access',
  CLIENT_WS = 'ws',
  OWNER = 'owner-jwt-access',
  MANAGER = 'manager-jwt-access',
  WS = 'ws',
}

export enum EAppId {
  CLIENT_MOBILE = 'client-mobile',
  MANAGER = 'manager',
}

export interface IOwnerPayload {
  id: string;
  email: string;
}

export interface IEmployeePayload {
  id: string;
  login: string;
}

export interface ITokenPayload {
  id: string;
  paths: string;
  iat: number;
  exp: number;
}

export type TStrategyType = EStrategy.ADMIN | EStrategy.OWNER | EStrategy.MANAGER;

class AuthService {
  passport: PassportStatic;

  private strategyMapper(type: EStrategy) {
    switch (type) {
      case EStrategy.ADMIN: {
        return {
          secret: process.env.ADMIN_JWT_SECRET,
          expiresIn: process.env.WEB_ACCESS_JWT_EXPIRES_IN,
          refresh: process.env.REFRESH_JWT_SECRET,
          refreshExpiresIn: process.env.REFRESH_JWT_EXPIRES_IN,
        };
      }
      // mobile
      case EStrategy.CLIENT: {
        return {
          secret: process.env.ACCESS_CLIENT_JWT_SECRET,
          expiresIn: process.env.MOBILE_ACCESS_JWT_EXPIRES_IN,
        };
      }
      case EStrategy.CLIENT_WS: {
        return {
          secret: process.env.ACCESS_WS_JWT_SECRET,
          expiresIn: process.env.MOBILE_ACCESS_JWT_EXPIRES_IN,
        };
      }
      case EStrategy.OWNER: {
        return {
          secret: process.env.ACCESS_OWNER_JWT_SECRET,
          expiresIn: process.env.WEB_ACCESS_JWT_EXPIRES_IN,
          refresh: process.env.REFRESH_JWT_SECRET,
          refreshExpiresIn: process.env.REFRESH_JWT_EXPIRES_IN,
        };
      }
      case EStrategy.MANAGER: {
        return {
          secret: process.env.ACCESS_OWNER_JWT_SECRET,
          expiresIn: process.env.WEB_ACCESS_JWT_EXPIRES_IN,
          refresh: process.env.REFRESH_JWT_SECRET,
          refreshExpiresIn: process.env.REFRESH_JWT_EXPIRES_IN,
        };
      }
      case EStrategy.WS: {
        return {
          secret: process.env.ACCESS_WS_JWT_SECRET,
          expiresIn: process.env.WS_ACCESS_JWT_EXPIRES_IN,
        };
      }
      default: {
        const _exhaustiveCheck: never = type;
        return _exhaustiveCheck;
      }
    }
  }

  constructor() {
    this.passport = passport;

    {
      const { secret } = this.strategyMapper(EStrategy.CLIENT);
      this.passport.use(
        EStrategy.CLIENT,
        new JWTStrategy(
          { secretOrKey: secret, jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() },
          async (payload: { id: string }, done) => {
            const client = await prisma.client.findUnique({
              where: { id: payload.id },
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                date_birth: true,
                email: true,
                first_name: true,
                last_name: true,
                phone_number: true,
                has_email_notifications: true,
                is_email_verified: true,
                push_notifications: true,
                verification_code: true,
              },
            });

            if (!client) {
              return done(new TRPCError({ code: 'UNAUTHORIZED' }));
            }

            return done(null, client);
          }
        )
      );
    }

    {
      const { secret } = this.strategyMapper(EStrategy.OWNER);
      this.passport.use(
        EStrategy.OWNER,
        new JWTStrategy(
          { secretOrKey: secret, jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() },
          async (payload: { id: string }, done) => {
            const owner = await prisma.owner.findUnique({
              where: { id: payload.id },
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                email: true,
                phone_number: true,
                name: true,
              },
            });

            if (!owner) {
              return done(new TRPCError({ code: 'UNAUTHORIZED' }));
            }
            return done(null, owner);
          }
        )
      );
    }

    {
      const { secret } = this.strategyMapper(EStrategy.MANAGER);
      this.passport.use(
        EStrategy.MANAGER,
        new JWTStrategy(
          { secretOrKey: secret, jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() },
          async (payload: { id: string }, done) => {
            const employee = await prisma.employee.findUnique({
              where: { id: payload.id },
            });

            const owner = await prisma.owner.findUnique({
              where: { id: payload.id },
            });

            if (employee) {
              return done(null, employee);
            }
            if (owner) {
              return done(null, owner);
            }

            return done(new TRPCError({ code: 'UNAUTHORIZED' }));
          }
        )
      );
    }

    {
      const { secret } = this.strategyMapper(EStrategy.ADMIN);
      this.passport.use(
        EStrategy.ADMIN,
        new JWTStrategy(
          { secretOrKey: secret, jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() },
          async (payload: { id: string }, done) => {
            const admin = await prisma.admin.findUnique({
              where: { id: payload.id },
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                email: true,
              },
            });

            if (!admin) {
              return done(new TRPCError({ code: 'UNAUTHORIZED' }));
            }
            return done(null, admin);
          }
        )
      );
    }
  }

  generateVerificationCode(digits: number = 6) {
    return Math.random().toFixed(digits).split('.')[1];
  }

  hash(str: string) {
    return bcrypt.hashSync(str, Number(process.env.SALT));
  }

  compare({ str, hash }: { hash: string; str: string }) {
    return bcrypt.compareSync(str, hash);
  }

  generateAccessToken(
    payload: {
      id: string;
      email?: string;
      login?: string;
      role?: EEmployeeRole | 'owner';
      placeId?: string;
    },
    options: { type: EStrategy; appId?: EAppId } = { type: EStrategy.MANAGER }
  ) {
    const newPayload = options.appId ? { ...payload, appId: options.appId } : payload;
    const { expiresIn, secret } = this.strategyMapper(options.type);

    return sign(newPayload, secret || '', {
      expiresIn,
    });
  }

  decodeToken(token: string): ITokenPayload {
    return decode(token) as ITokenPayload;
  }

  generateTokens(payload: { id: string }, options: { type: TStrategyType } = { type: EStrategy.MANAGER }) {
    const accessToken = this.generateAccessToken(payload, options);

    const { refresh, refreshExpiresIn, expiresIn } = this.strategyMapper(options.type);

    const refreshToken = sign(payload, refresh || '', {
      expiresIn: refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      refreshExpiresIn,
      expiresIn: getExpiresIn(expiresIn || '7d'),
    };
  }
}

export const authService = new AuthService();
