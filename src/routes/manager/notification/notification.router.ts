import { router } from '../../createRouter';
import { managerPrivateProcedure } from '../../../privateProcedures';
import { countNotificationsDto, makeViewedDto, notificationListDto } from './dto';

export const notificationRouter = router({
  countNew: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(countNotificationsDto)
    .query(async ({ ctx: { req, prisma }, input }) => {
      const viewer: Record<string, string> = {};
      if ('role' in req.user) {
        viewer.employee_id = req.user.id;
      } else {
        viewer.owner_id = req.user.id;
      }

      const totalCount = await prisma.managerNotification.count({
        where: {
          OR: [{ employee_id: null, owner_id: null }, { NOT: [viewer] }],
          BookingNotification: {
            place_id: input.placeId,
          },
          ManagerNotificationViewedBy: {
            none: {
              OR: [
                {
                  employee_id: req.user.id,
                },
                {
                  owner_id: req.user.id,
                },
              ],
            },
          },
        },
      });

      return {
        data: {
          totalCount,
        },
      };
    }),
  list: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(notificationListDto)
    .query(async ({ ctx: { req, prisma }, input }) => {
      const viewer: Record<string, string> = {};
      if ('role' in req.user) {
        viewer.employee_id = req.user.id;
      } else {
        viewer.owner_id = req.user.id;
      }
      
      const where = {
        OR: [{ employee_id: null, owner_id: null }, { NOT: [viewer] }],
        BookingNotification: {
          place_id: input.placeId,
        },
      };

      const totalCount = await prisma.managerNotification.count({
        where,
      });

      const notifications = await prisma.managerNotification.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          id: true,
          created_at: true,
          BookingNotification: {
            select: {
              id: true,
              booking_status: true,
              Booking: {
                select: {
                  id: true,
                  booking_number: true,
                },
              },
            },
          },
          ManagerNotificationViewedBy: {
            where: {
              OR: [
                {
                  employee_id: req.user.id,
                },
                {
                  owner_id: req.user.id,
                },
              ],
            },
            select: {
              id: true,
            },
          },
          Client: {
            select: {
              first_name: true,
            },
          },
          Employee: {
            select: {
              name: true,
              role: true,
            },
          },
          Owner: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      let nextCursor: typeof input.cursor | undefined;
      if (notifications.length > input.limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem!.id;
      }

      return { notifications, nextCursor, totalCount };
    }),

  makeViewed: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  })
    .input(makeViewedDto)
    .mutation(async ({ ctx: { req, prisma }, input }) => {
      const viewer: Record<string, string> = {};
      if ('role' in req.user) {
        viewer.employee_id = req.user.id;
      } else {
        viewer.owner_id = req.user.id;
      }

      const viewedBy = await prisma.managerNotificationViewedBy.create({
        data: { ...viewer, manager_notification_id: input.notificationId },
      });

      return viewedBy;
    }),
});
