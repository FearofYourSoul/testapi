import { EEmployeeRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { router } from '../../createRouter';
import { updateOwnerDto, updatePasswordDto } from './dto';
import { authService } from '../../../services';
import { managerPrivateProcedure } from '../../../privateProcedures';
import { logger } from '../../../log';

export type TRoleType = EEmployeeRole | 'owner';

export const ownerRouter = router({
  update: managerPrivateProcedure()
    .input(updateOwnerDto)
    .mutation(async ({ ctx: { req, prisma }, input }) => {
      if (input.login) {
        const existLogin = prisma.owner.findUnique({
          where: {
            login: input.login,
          },
        });
        const existEmployee = prisma.employee.findUnique({
          where: {
            login: input.login,
          },
        });
        const users = await prisma.$transaction([existLogin, existEmployee]);

        if (!users.every((v) => !v)) {
          logger.info(
            `Unable to update owner. Employee or Owner with such login already exist. login: ${input.login}, manager: ${req.user.id}`
          );
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User with such login already exist',
          });
        }
      }

      const user = await prisma.owner.update({
        where: {
          id: req.user.id,
        },
        data: {
          login: input.login,
          name: input.name,
        },
      });
      return user;
    }),
  updatePassword: managerPrivateProcedure()
    .input(updatePasswordDto)
    .mutation(async ({ ctx: { req, prisma }, input }) => {
      const user = await prisma.owner.findUnique({
        where: {
          id: req.user.id,
        },
      });

      if (!user) {
        logger.error(`Manager is unauthorized. manager: ${req.user.id}`);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
        });
      }

      const oldHashedPassword = authService.hash(user.password);
      if (authService.compare({ str: input.oldPassword, hash: oldHashedPassword })) {
        logger.debug(`Manager sent wrong old password. manager: ${req.user.id}`);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Wrong old password',
        });
      }

      const newPassword = authService.hash(input.password);

      await prisma.owner.update({
        where: {
          id: req.user.id,
        },
        data: {
          password: newPassword,
        },
      });
    }),
});
