import { TRPCError } from '@trpc/server';

import { managerPrivateProcedure } from '../../../../privateProcedures';
import { router } from '../../../createRouter';
import {
  addAddressDto,
  deleteAddressDto,
  getAddressAutocompleteDetailsDto,
  getAddressAutocompleteDto,
  updateAddressDto,
} from './dto';
import { googlePlaceAPIService } from '../../../../services/googlePlaceAPI.service';
import { logger } from '../../../../log';

export const addressRouter = router({
  add: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(addAddressDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const place = await prisma.place.findFirst({
        where: {
          id: input.placeId,
          ...whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!place) {
        logger.info(`Attempted to add place address for inexisting place. place: ${input.placeId}`);
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const address = await prisma.address.create({
        data: {
          address_line1: input.addressLine1,
          address_line2: input.addressLine2,
          city: input.city,
          country: input.country,
          postal_code: input.postalCode,
          Place: {
            connect: {
              id: place.id,
            },
          },
        },
        select: {
          city: true,
          address_line1: true,
          address_line2: true,
          country: true,
          id: true,
          postal_code: true,
        },
      });

      return address;
    }),
  update: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(updateAddressDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const address = await prisma.address.findFirst({
        where: {
          id: input.id,
          Place: whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!address) {
        logger.info(`Attempted to update place address that doesn't exist. address: ${input.id}`);
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const updatedAddress = await prisma.address.update({
        where: {
          id: address.id,
        },
        data: {
          address_line1: input.addressLine1,
          address_line2: input.addressLine2,
          city: input.city,
          country: input.country,
          postal_code: input.postalCode,
        },
        select: {
          city: true,
          address_line1: true,
          address_line2: true,
          country: true,
          id: true,
          postal_code: true,
        },
      });

      return updatedAddress;
    }),
  delete: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(deleteAddressDto)
    .mutation(async ({ ctx: { req, prisma, whereCondition }, input }) => {
      const address = await prisma.address.findFirst({
        where: {
          id: input.addressId,
          Place: whereCondition.PlaceTable.PlaceSection.Place,
        },
        select: {
          id: true,
        },
      });

      if (!address) {
        logger.info(`Attempted to delete place address that doesn't exist. address: ${input.addressId}`);
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await prisma.address.delete({
        where: {
          id: address.id,
        },
      });
    }),
  autocomplete: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(getAddressAutocompleteDto)
    .query(async ({ input }) => {
      const data = await googlePlaceAPIService.getAddressAutocomplete(input);
      return data;
    }),
  autocompleteDetails: managerPrivateProcedure({
    administrator: true,
    manager: true,
  })
    .input(getAddressAutocompleteDetailsDto)
    .query(async ({ input }) => {
      const data = await googlePlaceAPIService.getAddressAutocompleteDetails(input);

      if (!data) {
        logger.info(
          `Attempted to get autocomplete place details for inexisting google place. google place: ${input.placeId}`
        );
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return data;
    }),
});
