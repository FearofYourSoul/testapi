import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch';

export interface IPlaceToAdd {
  id: string;
  description: string | null;
  name: string;
  Address: {
    address_line1: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  PlaceSection: {
    name: string;
  }[];
  PlaceMenuCategory: {
    name: string;
  }[];
}

export interface ISavedRecords {
  PlaceSection: string;
  PlaceMenuCategory: string;
  id: string;
  objectID: string;
  description: string | null;
  name: string;
  Address: {
    address_line1: string;
  } | null;
  _geoloc: {
    lat: number;
    lng: number;
  } | null;
}

interface ISearchParams {
  lat?: number;
  lng?: number;
  search: string;
}

const IS_ALGOLIA_ENABLE = process.env.ALGOLIA_IS_ENABLE === 'true';

class AlgoliaSearch {
  private client: SearchClient;
  private index: SearchIndex;

  constructor() {
    if (!process.env.ALGOLIA_API_KEY) {
      throw new Error('Process env ALGOLIA_API_KEY is not defined');
    }
    if (!process.env.ALGOLIA_APP_ID) {
      throw new Error('Process env ALGOLIA_APP_ID is not defined');
    }
    this.client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
    this.index = this.client.initIndex('places');
  }

  async addPlaces(places: Array<IPlaceToAdd>) {
    if (!IS_ALGOLIA_ENABLE) {
      return;
    }
    const placesToAdd: Array<ISavedRecords> = places.map((data) => ({
      description: data.description,
      id: data.id,
      name: data.name,
      objectID: data.id,
      Address: data.Address,
      PlaceMenuCategory: data.PlaceMenuCategory.map((category) => category.name)
        .filter((data) => !!data)
        .join(' | '),
      PlaceSection: data.PlaceSection.map((category) => category.name).join(' | '),
      _geoloc:
        data.Address?.latitude && data.Address?.longitude
          ? {
              lat: data.Address?.latitude,
              lng: data.Address?.longitude,
            }
          : null,
    }));

    await this.index.saveObjects(placesToAdd, { autoGenerateObjectIDIfNotExist: true }).wait();
  }

  async updatePlaces(places: Array<Partial<IPlaceToAdd> & { id: string }>) {
    if (!IS_ALGOLIA_ENABLE) {
      return;
    }
    try {
      const placesToAdd: Array<Partial<ISavedRecords> & { id: string }> = places.map((data) => ({
        description: data.description,
        id: data.id,
        name: data.name,
        objectID: data.id,
        Address: data.Address,
        PlaceMenuCategory: data.PlaceMenuCategory?.map((category) => category.name)
          .filter((data) => !!data)
          .join(' | '),
        PlaceSection: data.PlaceSection?.map((category) => category.name).join(' | '),
        _geoloc:
          data.Address?.latitude && data.Address?.longitude
            ? {
                lat: data.Address?.latitude,
                lng: data.Address?.longitude,
              }
            : null,
      }));

      await this.index.partialUpdateObjects(placesToAdd).wait();
    } catch (error) {}
  }

  async deletePlaces(placesIds: Array<string>) {
    if (!IS_ALGOLIA_ENABLE) {
      return;
    }
    try {
      await this.index.deleteObjects(placesIds).wait();
    } catch (error) {}
  }

  async search({ lat, lng, search }: ISearchParams) {
    if (!(IS_ALGOLIA_ENABLE && ((lat && lng) || search))) {
      return;
    }
    const placesIds = await this.index.search<{ id: string }>(search, {
      attributesToRetrieve: ['id'],
      aroundRadius: 20000,
      aroundLatLng: `${lat},${lng}`,
    });
    return placesIds.hits;
  }
}

export const algoliaSearchService = new AlgoliaSearch();
