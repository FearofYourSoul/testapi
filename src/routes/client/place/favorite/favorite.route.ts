import { clientPrivateProcedure } from '../../../../privateProcedures';
import { placeService } from '../../../../services';
import { router } from '../../../createRouter';
import { addFavoriteDto, getFavoritePlaceDto, getFavoritePlacesDto } from './dto';

export const favoriteRoute = router({
  add: clientPrivateProcedure.input(addFavoriteDto).mutation(async ({ ctx: { req, prisma }, input }) => {
    const placeFavorite = await prisma.favoritePlace.create({
      data: {
        place_id: input.placeId,
        client_id: req.user.id,
      },
    });

    return placeFavorite;
  }),
  delete: clientPrivateProcedure.input(addFavoriteDto).mutation(async ({ ctx: { req, prisma }, input }) => {
    const placeFavorite = await prisma.favoritePlace.delete({
      where: {
        place_id_client_id: {
          place_id: input.placeId,
          client_id: req.user.id,
        },
      },
    });

    return placeFavorite;
  }),
  list: clientPrivateProcedure.input(getFavoritePlacesDto).query(async ({ ctx: { req, prisma }, input }) => {
    // TODO get region by ip https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
    const places = await placeService.getPlaces({ ...input, clientId: req.user.id });

    return places;
  }),
  byId: clientPrivateProcedure.input(getFavoritePlaceDto).query(async ({ ctx: { req, prisma }, input }) => {
    const place = await placeService.getClientPlace({ placeId: input.id, clientId: req.user.id });

    return place;
  }),
});
