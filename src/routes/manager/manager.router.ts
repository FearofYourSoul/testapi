import { EEmployeeRole } from '@prisma/client';

import { router } from '../createRouter';
import { bookingRouter } from './booking';
import { employeeRouter } from './employee';
import { placeRouter } from './places';
import { ownerRouter } from './owner';
import { notificationRouter } from './notification';
import { managerPrivateProcedure } from '../../privateProcedures';

export type TRoleType = EEmployeeRole | 'owner';

export const managerRouter = router({
  me: managerPrivateProcedure({
    administrator: true,
    hostess: true,
    manager: true,
  }).query(({ ctx: { req, prisma } }) => {
    const { email, id, name, phone_number, is_email_verified, is_phone_verified } = req.user;

    return {
      email,
      login: 'login' in req.user ? req.user.login : undefined,
      id,
      name,
      phone_number,
      is_email_verified,
      is_phone_verified,
      role: ('role' in req.user ? req.user.role : 'owner') as TRoleType,
    };
  }),
  booking: bookingRouter,
  employee: employeeRouter,
  owner: ownerRouter,
  places: placeRouter,
  notifications: notificationRouter,
});
