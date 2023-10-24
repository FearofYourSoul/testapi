import { managerPrivateProcedure } from '../../../../privateProcedures';
import { router } from '../../../createRouter';
import { applyPlaceDto } from './dto';

export const placesRouter = router({
  // TODO: Could manager change the employee places?
  change: managerPrivateProcedure()
    .input(applyPlaceDto)
    .mutation(async ({ ctx: { req, res, prisma, whereCondition }, input }) => {
      const places = await prisma.place.findMany({
        where: {
          ...whereCondition.PlaceTable.PlaceSection.Place,
          id: {
            in: input.placesIds,
          },
          Employee: {
            none: {
              employee_id: input.employeeId,
            },
          },
        },
      });

      await prisma.employeePlace.deleteMany({
        where: {
          Place: whereCondition.PlaceTable.PlaceSection.Place,
          employee_id: input.employeeId,
          place_id: {
            notIn: input.placesIds,
          },
        },
      });

      const employeePlaces = places.map(({ id }) => {
        return prisma.employeePlace.create({
          data: { place_id: id, employee_id: input.employeeId },
        });
      });

      await prisma.$transaction(employeePlaces);

      const employeePlace = await prisma.employeePlace.findMany({
        where: {
          employee_id: input.employeeId,
        },
        select: {
          Place: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return employeePlace;
    }),
});
