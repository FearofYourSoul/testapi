import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';

import { authService, EStrategy } from '../../../services';
import { publicProcedure, router } from '../../createRouter';
import { tokenDto, webAuthDto } from '../dto';

export const adminAuthRouter = router({
  login: publicProcedure.input(webAuthDto).mutation(async ({ ctx: { req, prisma }, input }) => {
    const user = await prisma.admin.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        password: true
      }
    })

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED'
      })
    }

    const { password: hashedPassword, ...admin } = user;

    if (!authService.compare({ str: input.password, hash: hashedPassword })) {
      throw new TRPCError({
        code: 'UNAUTHORIZED'
      })
    }

    const { accessToken, refreshToken, expiresIn } = authService.generateTokens({ id: admin.id }, { type: EStrategy.ADMIN });

    await prisma.admin.update({
      where: {
        id: admin.id
      },
      data: {
        refresh_token: authService.hash(refreshToken.split('.')[2]),
      }
    })

    return {
      accessToken,
      refreshToken,
      expiresIn,
      admin
    }
  }),
  refresh: publicProcedure.input(tokenDto).mutation(async ({ ctx: { req, prisma }, input }) => {
    const payload = jwt.verify(input.token, process.env.REFRESH_JWT_SECRET || '') as jwt.JwtPayload | null;

    if (!payload) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    const admin = await prisma.admin.findUnique({ where: {
      id: payload.id,
    }, select: {
      id: true,
      refresh_token: true,
    } })

    if (!admin?.refresh_token) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    let signature;

    try {
      signature = input.token.split('.')[2];
    } catch (e) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    if (!authService.compare({ str: signature, hash: admin.refresh_token })) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    const { accessToken, refreshToken, expiresIn } = authService.generateTokens({ id: payload.id }, { type: EStrategy.ADMIN });

    await prisma.admin.update({
      where: {
        id: admin.id,
      },
      data: {
        refresh_token: authService.hash(refreshToken.split('.')[2]),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  })
})
