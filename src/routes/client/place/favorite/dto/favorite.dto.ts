import { z } from "zod";
import { getPlacesDto } from "../../../../public/place/dto";

export const getFavoritePlacesDto = getPlacesDto;

export const getFavoritePlaceDto = z.object({
  id: z.string(),
});

export const addFavoriteDto = z.object({
  placeId: z.string(),
});