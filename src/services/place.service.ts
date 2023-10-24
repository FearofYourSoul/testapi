import dayjs from 'dayjs';
import { EDayOfWeek, Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { prisma } from '../utils/prisma';
import { TGetPublicPlacesDto } from '../routes/public/place/dto';
import { formatToWorkingHour } from '../utils/getTime';
import { getAreaRange } from '../utils/getAreaRange';
import { algoliaSearchService } from './algolia.service';

export enum EPreferences {
  FAVORITE = 'favorite',
  WITH_TERRACE = 'terrace',
}

export enum EPlaceSortTypes {
  CLOSEST = 'closest',
  EXPENSIVE = 'expensive',
  INEXPENSIVE = 'inexpensive',
  QUICK_RESPONSE = 'quickResponse',
}

type TGetPlacesProps = TGetPublicPlacesDto & { clientId?: string };

interface IGetClientPlace {
  placeId: string;
  clientId: string;
}

const placesSelect = {
  id: true,
  logo_url: true,
  name: true,
  expensiveness: true,
  description: true,
  Address: {
    select: {
      city: true,
      address_line1: true,
      address_line2: true,
      postal_code: true,
      country: true,
    },
  },
  PlaceKitchen: {
    select: {
      Kitchen: {
        select: {
          name: true,
          id: true,
        },
      },
    },
  },
  CategoryPlace: {
    // TODO I think place should have only one category
    select: {
      Category: {
        select: {
          name: true,
          id: true,
        },
      },
    },
  },
  BaseImage: {
    select: {
      id: true,
      small: true,
      medium: true,
      large: true,
      base: true,
    },
  },
  WorkingHours: {
    select: {
      day: true,
      end_time: true,
      start_time: true,
      is_day_off: true,
    },
  },
  ReservesSettings: {
    select: {
      unreachable_interval: true,
      response_time: true,
      delayed_response_time: true,
    },
  },
};

const placeSelect = {
  WorkingHours: {
    select: {
      day: true,
      end_time: true,
      is_day_off: true,
      is_working_all_day: true,
      start_time: true,
    },
  },
  Image: {
    select: {
      id: true,
      small: true,
      medium: true,
      large: true,
      base: true,
    },
  },
  PlaceSection: {
    select: {
      id: true,
      name: true,
      width: true,
      height: true,
      is_default: true,
      external_id: true,
    },
  },
};

const getDistance = ({ latitude, longitude }: { longitude?: number; latitude?: number }) => {
  if (!latitude || !longitude) {
    return;
  }
  const { start, end } = getAreaRange({ lat: latitude, lng: longitude, distance: 20 });
  return {
    latitude: {
      lte: end.lat,
      gte: start.lat,
    },
    longitude: {
      lte: end.lng,
      gte: start.lng,
    },
  };
};

const withCondition = <T extends object, U = undefined>({
  data,
  condition,
  elseResult,
}: {
  condition?: boolean;
  data: T;
  elseResult?: U;
}): T | U => (condition ? data : (elseResult as U));

class PlaceService {
  async getPlaces(input?: TGetPlacesProps) {
    const ids = (
      await algoliaSearchService.search({
        lat: input?.latitude,
        lng: input?.longitude,
        search: input?.search || '',
      })
    )?.map((data) => data.id);

    const where: Prisma.PlaceWhereInput = {
      AND: [
        ids
          ? {
              id: {
                in: ids,
              },
            }
          : {
              name: {
                contains: input?.search,
                mode: 'insensitive',
              },
              description: {
                contains: input?.search,
                mode: 'insensitive',
              },
            },
        {
          CategoryPlace: {
            some: {
              Category: {
                name: {
                  in: input?.category,
                },
              },
            },
          },
          expensiveness: {
            in: input?.expensiveness,
          },
        },
        {
          is_published: true,
        },
        this.getAddressFiltersWhereInput(input),
        this.getKitchensFiltersWhereInput(input),
        this.getPreferenceWhereInput(input),
        this.getResponseTimeFiltersWhereInput(input),
        this.getTimeFiltersWhereInput(input),
      ],
    };

    const totalCount = await prisma.place.count({ where });
    const places = await prisma.place.findMany({
      where,
      take: (input?.limit || 8) + 1,
      cursor: input?.cursor ? { id: input?.cursor } : undefined,
      select: {
        ...placesSelect,
        FavoritePlace: input?.clientId
          ? {
              where: {
                client_id: input?.clientId,
              },
            }
          : false,
      },
      orderBy: this.getPlacesSort(input?.sortBy),
    });

    const cursor = input?.cursor;
    let nextCursor: typeof cursor;
    if (places.length > (input?.limit || 8)) {
      const nextItem = places.pop();
      nextCursor = nextItem!.id;
    }

    return {
      totalCount,
      places,
      nextCursor,
    };
  }

  async getPublicPlace(id: string) {
    const { BaseImage, ...select } = placesSelect;

    const place = await prisma.place.findUnique({
      where: { id },
      select: {
        ...select,
        ...placeSelect,
      },
    });

    if (!place) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Place not found',
      });
    }

    return place;
  }

  async getClientPlace({ placeId, clientId }: IGetClientPlace) {
    const { BaseImage, ...select } = placesSelect;

    const place = await prisma.place.findFirst({
      where: { id: placeId },
      select: {
        ...select,
        FavoritePlace: {
          where: {
            client_id: clientId,
            place_id: placeId,
          },
          select: {
            client_id: true,
          },
        },
        ...placeSelect,
      },
    });

    if (!place) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Place not found',
      });
    }

    return place;
  }

  private getAddressFiltersWhereInput(input?: TGetPlacesProps): Prisma.PlaceWhereInput {
    return {
      Address: withCondition({
        condition: !!(input?.countryCode || (input?.latitude && input?.longitude)),
        data: {
          OR: [
            {
              country_code: input?.countryCode?.toUpperCase(),
            },
            getDistance({ latitude: input?.latitude, longitude: input?.longitude }) || {},
          ],
        },
      }),
    };
  }

  private getKitchensFiltersWhereInput(input?: TGetPlacesProps): Prisma.PlaceWhereInput {
    return {
      PlaceKitchen: withCondition({
        condition: !!(input?.kitchens && input?.kitchens.length),
        data: {
          some: {
            Kitchen: {
              name: {
                in: input?.kitchens,
              },
            },
          },
        },
      }),
    };
  }

  private getResponseTimeFiltersWhereInput(input?: TGetPlacesProps): Prisma.PlaceWhereInput {
    return {
      ReservesSettings: withCondition({
        condition: !!input?.responseTime,
        data: {
          response_time: {
            lte: input?.responseTime,
          },
        },
      }),
    };
  }

  private getTimeFiltersWhereInput(input?: TGetPlacesProps): Prisma.PlaceWhereInput {
    const dateTime = input?.date ? dayjs(input.date) : undefined;
    const timestampDate = dateTime?.toISOString();
    const formattedDate = formatToWorkingHour({ timestamp: dateTime });

    return {
      WorkingHours: withCondition({
        condition: !!dateTime,
        data: {
          some: {
            day: dateTime ? Object.values(EDayOfWeek)[dateTime.day()] : undefined,
            is_day_off: false,
            start_time: {
              lte: formattedDate.toISOString(),
            },
            end_time: {
              gte: formattedDate.toISOString(),
            },
          },
        },
      }),
      PlaceSection: {
        some: {
          PlaceTable: {
            some: {
              seats: input?.countOfPersons
                ? {
                    gte: input?.countOfPersons,
                  }
                : undefined,
              OR: [
                {
                  BookingTable: {
                    none: {},
                  },
                },
                {
                  BookingTable: {
                    every: {
                      NOT: {
                        start_time: {
                          lte: timestampDate,
                        },
                        end_time: {
                          gt: timestampDate,
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };
  }

  private getPreferenceWhereInput(input?: TGetPlacesProps): Prisma.PlaceWhereInput {
    return {
      OR: [
        withCondition({
          condition: !!(input?.preferences?.includes(EPreferences.FAVORITE) && input?.clientId),
          data: {
            NOT: {
              FavoritePlace: {
                none: {},
              },
            },
            FavoritePlace: {
              some: {
                client_id: input?.clientId,
              },
            },
          },
          elseResult: {},
        }),
        withCondition({
          condition: !!input?.preferences?.includes(EPreferences.WITH_TERRACE),
          data: {
            PlaceSection: {
              some: {
                is_summer_terrace: !!input?.preferences?.includes(EPreferences.WITH_TERRACE) ? true : undefined,
              },
            },
          },
          elseResult: {},
        }),
      ],
    };
  }

  private getPlacesSort(
    sort?: EPlaceSortTypes
  ): Prisma.Enumerable<Prisma.PlaceOrderByWithRelationAndSearchRelevanceInput> {
    const defaultValue = [
      // TODO: find better solution
      {
        Address: {
          latitude: 'asc' as Prisma.SortOrder,
        },
      },
      {
        Address: {
          longitude: 'asc' as Prisma.SortOrder,
        },
      },
    ];
    switch (sort) {
      case EPlaceSortTypes.CLOSEST:
        return defaultValue;
      case EPlaceSortTypes.EXPENSIVE:
        return {
          expensiveness: 'desc',
        };
      case EPlaceSortTypes.INEXPENSIVE:
        return {
          expensiveness: 'asc',
        };
      case EPlaceSortTypes.QUICK_RESPONSE:
        return [
          {
            ReservesSettings: {
              response_time: 'asc',
            },
          },
          ...defaultValue,
        ];
      default:
        return defaultValue;
    }
  }
}

export const placeService = new PlaceService();
