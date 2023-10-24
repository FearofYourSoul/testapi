import { TRPCError } from '@trpc/server';

import { accountRouter } from './account';
import { bookingRouter } from './booking';
import { clientPrivateProcedure } from '../../privateProcedures';
import { placeRouter } from './place';
import { router } from '../createRouter';
import { logger } from '../../log';

export const clientRouter = router({
  me: clientPrivateProcedure.query(async ({ ctx: { req, prisma } }) => {
    const user = await prisma.client.findUnique({
      where: { id: req.user.id },
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
        CurrentLocation: {
          select: {
            address_line1: true,
            city: true,
            country: true,
            country_code: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!user) {
      logger.warn(`attempted to get me info without authorization. user: ${req.user.phone_number}`);
      throw new TRPCError({ message: 'Client not authorized', code: 'UNAUTHORIZED' });
    }

    return user;
  }),
  account: accountRouter,
  booking: bookingRouter,
  place: placeRouter,
});
