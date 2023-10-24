import { z } from 'zod';

const generalAddPlaceImageDto = z.object({
  placeId: z.string(),
});

export const addPlaceImagesDto = generalAddPlaceImageDto.extend({
  images: z.array(z.string()).max(10, { message: 'max_length' }),
});

export const addPlaceBaseImageDto = generalAddPlaceImageDto.extend({
  image: z.string(),
});

export const deleteImageDto = z.object({
  id: z.string(),
});

const imagesIdsOrBase64 = z.array(z.string());

export const updateImagesDto = generalAddPlaceImageDto.extend({
  images: z
    .object({
      deleted: imagesIdsOrBase64.optional(),
      added: imagesIdsOrBase64,
    })
    .or(
      z.object({
        deleted: imagesIdsOrBase64,
        added: imagesIdsOrBase64.optional(),
      })
    ),
});
