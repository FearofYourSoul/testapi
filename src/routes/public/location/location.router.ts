import { TRPCError } from '@trpc/server';
import { getClientIp } from 'request-ip';

import { ipLocationService } from '../../../services';
import { googlePlaceAPIService } from '../../../services/googlePlaceAPI.service';
import { publicProcedure, router } from '../../createRouter';
import { getPlacesLocationDto } from './dto';
import { logger } from '../../../log';

export const locationRouter = router({
  places: publicProcedure.input(getPlacesLocationDto).query(async ({ input }) => {
    const data = await googlePlaceAPIService.getAvailableLocations(input);
    return data;
  }),
  locationByIp: publicProcedure.query(async ({ ctx: { req } }) => {
    let ip = getClientIp(req);

    if (process.env.NODE_ENV === 'development') {
      ip = await ipLocationService.getServerIPv4();
    }

    if (!ip) {
      logger.error(`Unable to extract ip from request.`)
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'IPv4 is not defined' });
    }

    const data = await ipLocationService.getLocationByIPv4(ip);
    if (data.regionCode === 'Invalid IP address.') {
      logger.error(`Unable to extract location from ip. IP: ${ip}`);
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bad IPv4' });
    }
    return data;
  }),
});
