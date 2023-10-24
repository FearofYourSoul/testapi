
import { publicProcedure, router } from '../../createRouter';
import { placeService } from '../../../services';
import { getPlacesDto, getPlaceDto } from './dto';
import { sectionRouter } from './section';
import { tableRouter } from './table';
import { menuRouter } from './menu';

export const placeRouter = router({
  list: publicProcedure.input(getPlacesDto).query(async ({ ctx: { prisma }, input }) => {
    const places = await placeService.getPlaces(input);

    return places;
  }),
  byId: publicProcedure.input(getPlaceDto).query(async ({ ctx: { prisma }, input }) => {
    const place = await placeService.getPublicPlace(input.id);

    return place;
  }),
  sections: sectionRouter,
  tables: tableRouter,
  menu: menuRouter,
});
