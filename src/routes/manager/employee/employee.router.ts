import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { authService } from '../../../services';
import { router } from '../../createRouter';
import {
  createEmployeeDto,
  deleteEmployeeDto,
  getEmployeeDto,
  getEmployeesDto,
  updateEmployeeDto,
  updatePasswordDto,
} from './dto';
import { placesRouter } from './places';
import { managerPrivateProcedure } from '../../../privateProcedures';
import { logger } from '../../../log';

export const employeeRouter = router({
  list: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(getEmployeesDto)
    .query(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const whereInput: Prisma.EmployeeWhereInput = {
        owner_id: req.user.id,
        role: {
          in: input.type,
        },
        EmployeePlace: {
          some: {
            place_id:
              input.placesIds && input.placesIds.length
                ? {
                    in: input.placesIds,
                  }
                : undefined,
            Place: whereCondition.PlaceTable.PlaceSection.Place,
          },
        },
        OR: input.search
          ? [
              {
                login: {
                  contains: input.search,
                },
              },
              {
                name: {
                  contains: input.search,
                },
              },
              {
                email: {
                  contains: input.search,
                },
              },
            ]
          : undefined,
      };

      const totalCount = await prisma.employee.count({
        where: whereInput,
      });

      const employees = await prisma.employee.findMany({
        where: whereInput,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          email: true,
          id: true,
          login: true,
          name: true,
          phone_number: true,
          role: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      let nextCursor: typeof input.cursor | undefined;
      if (employees.length > input.limit) {
        const nextItem = employees.pop();
        nextCursor = nextItem?.id;
      }

      return {
        employees,
        totalCount,
        nextCursor,
        limit: input.limit,
      };
    }),
  byId: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(getEmployeeDto)
    .query(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const employee = await prisma.employee.findFirst({
        where: {
          id: input.employeeId,
          owner_id: req.user.id,
          EmployeePlace: {
            some: {
              Place: whereCondition.PlaceTable.PlaceSection.Place,
            },
          },
        },
        select: {
          email: true,
          id: true,
          is_email_verified: true,
          login: true,
          name: true,
          phone_number: true,
          is_phone_verified: true,
          role: true,
          EmployeePlace: {
            select: {
              Place: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!employee) {
        logger.info(
          `Attempted get employee that doesn't exist or manager has no rights. employee: ${input.employeeId}, manager: ${req.user.id}`
        );
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      return employee;
    }),
  create: managerPrivateProcedure({
    manager: true,
  })
    .input(createEmployeeDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const employeeExist = await prisma.employee.findFirst({
        where: {
          EmployeePlace: {
            some: {
              Place: whereCondition.PlaceTable.PlaceSection.Place,
            },
          },
          OR: [{ login: input.login }, { email: input.email }],
        },
      });

      const ownerExist = await prisma.owner.findFirst({
        where: {
          OR: [{ login: input.login }, { email: input.email }],
        },
      });

      if (employeeExist || ownerExist) {
        logger.info(
          `Unable to create employee. Employee or Owner with such login or email already exist. login: ${input.login}, email: ${input.email} manager: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Employee or Owner with such already exist',
        });
      }

      const hashedPsw = authService.hash(input.password);
      const employee = await prisma.employee.create({
        data: {
          email: input.email,
          role: input.role,
          name: input.name,
          login: input.login,
          password: hashedPsw,
          owner_id: req.user.id,
        },
        select: {
          email: true,
          id: true,
          is_email_verified: true,
          login: true,
          name: true,
          phone_number: true,
          is_phone_verified: true,
          role: true,
        },
      });

      const places = await prisma.place.findMany({
        where: {
          owner_id: req.user.id,
          id: {
            in: input.placesIds,
          },
          Employee: {
            none: {
              employee_id: employee.id,
            },
          },
        },
      });

      await prisma.employeePlace.deleteMany({
        where: {
          employee_id: employee.id,
          place_id: {
            notIn: input.placesIds,
          },
        },
      });

      const employeePlaces = places.map(({ id }) => {
        return prisma.employeePlace.create({
          data: { place_id: id, employee_id: employee.id },
        });
      });

      await prisma.$transaction(employeePlaces);

      return { ...employee, EmployeePlace: employeePlaces };
    }),
  update: managerPrivateProcedure({
    manager: true,
  })
    .input(updateEmployeeDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const employeeLogin = await prisma.employee.findFirst({
        where: {
          id: {
            not: input.employeeId,
          },
          EmployeePlace: {
            some: {
              Place: whereCondition.PlaceTable.PlaceSection.Place,
            },
          },
          OR: [{ login: input.login }, { email: input.email }],
        },
      });

      const ownerExist = await prisma.owner.findFirst({
        where: {
          OR: [{ login: input.login }, { email: input.email }],
        },
      });

      if (employeeLogin || ownerExist) {
        logger.info(
          `Unable to update employee. Employee or Owner with such login or email already exist. login: ${input.login}, email: ${input.email} manager: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Employee or Owner with such already exist',
        });
      }

      const employeeExist = await prisma.employee.findFirst({
        where: {
          id: input.employeeId,
          owner_id: req.user.id,
        },
      });

      if (!employeeExist) {
        logger.info(
          `Unable to update employee that doesn't exist. employee: ${input.employeeId}, manager: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Employee not found',
        });
      }

      const employee = await prisma.employee.update({
        where: {
          id: input.employeeId,
        },
        data: {
          email: input.email,
          role: input.role,
          name: input.name,
          login: input.login,
        },
        select: {
          email: true,
          id: true,
          is_email_verified: true,
          login: true,
          name: true,
          phone_number: true,
          is_phone_verified: true,
          role: true,
        },
      });

      return employee;
    }),
  delete: managerPrivateProcedure({
    manager: true,
  })
    .input(deleteEmployeeDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const employeeExist = await prisma.employee.findFirst({
        where: {
          EmployeePlace: {
            some: {
              Place: whereCondition.PlaceTable.PlaceSection.Place,
            },
          },
          id: input.employeeId,
          owner_id: req.user.id,
        },
      });

      if (!employeeExist) {
        logger.debug(
          `Unable to delete employee that doesn't exist. employee: ${input.employeeId}, manager: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Employee not found',
        });
      }

      await prisma.employeePlace.deleteMany({
        where: {
          employee_id: input.employeeId,
        },
      });

      await prisma.employee.delete({
        where: {
          id: input.employeeId,
        },
      });
    }),
  updatePassword: managerPrivateProcedure({
    manager: true,
  })
    .input(updatePasswordDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const employeeExist = await prisma.employee.findFirst({
        where: {
          id: input.employeeId,
          owner_id: req.user.id,
          EmployeePlace: {
            some: {
              Place: whereCondition.PlaceTable.PlaceSection.Place,
            },
          },
        },
      });

      if (!employeeExist) {
        logger.debug(
          `Unable to update employee's password, because employee doesn't exist. employee: ${input.employeeId}, manager: ${req.user.id}`
        );
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Employee not found',
        });
      }

      const hashedPsw = authService.hash(input.password);
      await prisma.employee.update({
        where: {
          id: input.employeeId,
        },
        data: {
          password: hashedPsw,
        },
      });
    }),
  places: placesRouter,
});
