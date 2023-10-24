import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';

import { authService, EAppId, EStrategy } from '../../../services';
import { publicProcedure, router } from '../../createRouter';
import { managerAuthDto, managerWSToken, tokenDto } from '../dto';
import { managerPrivateProcedure } from '../../../privateProcedures';
import { TRoleType } from '../../manager';
import { EErrorCode } from '../../../utils';
import { logger } from '../../../log';

interface IManagerLoginResults {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: TRoleType;
}

export const managerAuthRouter = router({
  login: publicProcedure.input(managerAuthDto).mutation(async ({ ctx: { req, res, prisma }, input }) => {
    const ownerRequest = prisma.owner.findFirst({
      where: {
        OR: [{ login: input.login }, { email: input.login }],
      },
      select: {
        id: true,
        is_email_verified: true,
        password: true,
      },
    });
    const employeeRequest = prisma.employee.findFirst({
      where: {
        OR: [{ login: input.login }, { email: input.login }],
      },
      select: {
        email: true,
        id: true,
        is_email_verified: true,
        password: true,
        role: true,
      },
    });

    const [owner, employee] = await prisma.$transaction([ownerRequest, employeeRequest]);

    if (!owner && !employee) {
      logger.debug(`didn't find owner or employee with login: ${input.login}`);
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invalid login or password',
      });
    }

    let results: IManagerLoginResults | undefined;

    if (owner && authService.compare({ str: input.password, hash: owner.password })) {
      if (!owner.is_email_verified) {
        logger.debug(`attempted to login owner with no email verified. login: ${input.login}`);
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: EErrorCode.VERIFICATION_REQUIRED,
        });
      }

      const { accessToken, refreshToken, expiresIn } = authService.generateTokens(
        { id: owner.id },
        { type: EStrategy.OWNER }
      );

      await prisma.refreshToken.upsert({
        where: {
          user_agent_owner_id: {
            user_agent: req.headers['user-agent'] || '',
            // ip: req.ip,
            owner_id: owner.id,
          },
        },
        create: {
          // ip: req.ip,
          user_agent: req.headers['user-agent'] || '',
          token: authService.hash(refreshToken.split('.')[2]),
          owner_id: owner.id,
        },
        update: {
          token: authService.hash(refreshToken.split('.')[2]),
        },
      });

      results = {
        accessToken,
        refreshToken,
        expiresIn,
        role: 'owner',
      };
    }

    if (employee && authService.compare({ str: input.password, hash: employee.password })) {
      if (employee.email === input.login && !employee.is_email_verified) {
        logger.debug(`attempted to login employee with no email verified. login: ${input.login}`);
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: EErrorCode.VERIFICATION_REQUIRED,
        });
      }

      const { accessToken, refreshToken, expiresIn } = authService.generateTokens(
        { id: employee.id },
        { type: EStrategy.MANAGER }
      );

      await prisma.refreshToken.upsert({
        where: {
          user_agent_employee_id: {
            user_agent: req.headers['user-agent'] || '',
            // ip: req.ip,
            employee_id: employee.id,
          },
        },
        create: {
          // ip: req.ip,
          user_agent: req.headers['user-agent'] || '',
          token: authService.hash(refreshToken.split('.')[2]),
          employee_id: employee.id,
        },
        update: {
          token: authService.hash(refreshToken.split('.')[2]),
        },
      });

      results = {
        accessToken,
        refreshToken,
        expiresIn,
        role: employee.role,
      };
    }

    if (!results) {
      logger.debug(`wrong password for owner or employee with login: ${input.login}`);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid login or password',
      });
    }

    logger.debug(`successful log in for ${owner ? 'owner' : 'employee'} with login: ${input.login}`);
    return results;
  }),
  refresh: publicProcedure.input(tokenDto).mutation(async ({ ctx: { req, res, prisma }, input }) => {
    let payload: jwt.JwtPayload;

    try {
      payload = jwt.verify(input.token, process.env.REFRESH_JWT_SECRET || '') as jwt.JwtPayload;
    } catch (e) {
      logger.info(`unable to verify refresh token: **********${input.token.slice(-4)}`);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    const oldRefreshOwnerToken = await prisma.refreshToken.findUnique({
      where: {
        user_agent_owner_id: {
          user_agent: req.headers['user-agent'] || '',
          // ip: req.ip,
          owner_id: payload.id,
        },
      },
      select: {
        token: true,
        id: true,
      },
    });

    const oldRefreshEmployeeToken = await prisma.refreshToken.findUnique({
      where: {
        user_agent_employee_id: {
          user_agent: req.headers['user-agent'] || '',
          // ip: req.ip,
          employee_id: payload.id,
        },
      },
      select: {
        token: true,
        id: true,
      },
    });

    const oldRefreshToken = oldRefreshOwnerToken || oldRefreshEmployeeToken;

    if (!oldRefreshToken) {
      logger.info(`unable to find old refresh token: **********${input.token.slice(-4)}`);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    let signature;

    try {
      signature = input.token.split('.')[2];
    } catch (e) {
      logger.info(`invalid refresh token format: **********${input.token.slice(-4)}`);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    if (!authService.compare({ str: signature, hash: oldRefreshToken.token })) {
      logger.info(`refresh token verfiication failed: **********${input.token.slice(-4)}`);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
      });
    }

    const { accessToken, refreshToken, refreshExpiresIn } = authService.generateTokens(
      { id: payload.id },
      { type: EStrategy.MANAGER }
    );

    await prisma.refreshToken.update({
      where: {
        id: oldRefreshToken.id,
      },
      data: {
        token: authService.hash(refreshToken.split('.')[2]),
      },
    });

    // TODO:
    // res.cookie('refreshToken', refreshToken, {
    // httpOnly: true,
    // secure: true,
    // sameSite: 'none',
    // expires: dayjs()
    // .add(Number(refreshExpiresIn!.split('')[0]), (refreshExpiresIn!.split('')[1] || 'd') as ManipulateType)
    // .toDate(),
    // });

    return {
      accessToken,
      refreshToken,
      // expiresIn,
    };
  }),
  ws: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(managerWSToken)
    .mutation(async ({ ctx: { req, prisma, ioService, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          ...whereCondition.PlaceTable.PlaceSection.Place,
          id: input.placeId,
        },
        select: {
          id: true,
        },
      });

      if (!place) {
        logger.info(`place with id: ${input.placeId} not found for user: ${req.user.login}`)
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const token = authService.generateAccessToken(
        {
          id: req.user.id,
          login: req.user.login || undefined,
          email: req.user.email || undefined,
          role: req.user.login ? 'hostess' : 'owner',
          placeId: place.id,
        },
        { type: EStrategy.WS, appId: EAppId.MANAGER }
      );

      ioService.setAllowedToken({ id: req.user.id, token });

      return token;
    }),
});
