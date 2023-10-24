import { z } from 'zod';

const address = z.object({
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  postalCode: z.string(),
  city: z.string(),
  country: z.string().optional(),
});

export const addAddressDto = address.extend({
  placeId: z.string(),
});

export const deleteAddressDto = z.object({
  addressId: z.string(),
});

export const updateAddressDto = address.partial().extend({
  id: z.string(),
});

export const getAddressAutocompleteDto = z.object({
  search: z.string().trim().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().min(1000).optional(),
  language: z.string().trim().min(2).max(2).optional(),
});

export const getAddressAutocompleteDetailsDto = z.object({
  placeId: z.string(),
  language: z.string().trim().min(2).max(2).optional(),
});
