import axios from 'axios';

import { logger } from '../log';

interface IPlaceResponse {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface IAvailableLocationsResponse {
  error_message?: string;
  results: Array<IPlaceResponse>;
}

interface IGetAvailableLocationsProps {
  latitude?: number;
  longitude?: number;
  /**
   * Examples BY, RU etc.
   */
  region?: string;
  query?: string;
  radius?: number;
  language?: string;
}

interface IFormattedAddress {
  addressLine1: string;
  city: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
  region: string;
}

interface IGetAddressAutocompleteProps {
  search: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  language?: string;
}

interface IPredictionResponse {
  description: string;
  place_id?: string;
}

interface IGetAddressAutocompleteResponse {
  error_message?: string;
  predictions: Array<IPredictionResponse>;
}

interface IGetAddressAutocompleteDetailsProps {
  placeId: string;
  language?: string;
}

interface IGetAddressAutocompleteDetailsResponse {
  error_message?: string;
  result?: IPlaceResponse;
}

class GooglePlaceAPIService {
  private apiKey: string;

  constructor() {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      throw new Error('env: GOOGLE_PLACES_API_KEY is not defined');
    }

    this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
  }

  private formatAddress({
    countryCode,
    fields,
  }: {
    fields: IAvailableLocationsResponse['results'][0];
    countryCode?: string;
  }): IFormattedAddress | undefined {
    if (!fields.formatted_address) {
      return;
    }
    const splittedAddress = fields.formatted_address.split(',').map((v) => v.trim());

    if (
      (splittedAddress.length <= 2 && !countryCode) ||
      (countryCode && splittedAddress.length <= 1) ||
      splittedAddress[0].split(' ').length <= 1
    ) {
      return;
    }

    let city = splittedAddress[1];
    let region = city;
    let postalCode;

    if (splittedAddress.length <= 3 && splittedAddress[1]) {
      [city, postalCode] = splittedAddress[1].split(' ');
      region = city;
    }
    if (splittedAddress.length === 4) {
      [region, postalCode] = splittedAddress[2].split(' ');
    }
    return {
      addressLine1: splittedAddress[0],
      city,
      // if params has a CountryCode, then there is no country in the response
      country: countryCode ? countryCode : splittedAddress[splittedAddress.length - 1],
      countryCode,
      postalCode,
      region,
      latitude: fields.geometry.location.lat,
      longitude: fields.geometry.location.lng,
    };
  }

  public async getAvailableLocations({
    radius = 20000,
    region,
    language,
    latitude,
    longitude,
    query = 'restaurants',
  }: IGetAvailableLocationsProps) {
    // TODO make this request chipper
    const places = await axios.get<IAvailableLocationsResponse>(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          key: this.apiKey,
          fields: ['geometry', 'formatted_address'],
          radius,
          query: region ? `${query}, ${region}` : query,
          language,
          region,
          location: latitude && longitude ? `${latitude},${longitude}` : undefined,
        },
      }
    );

    if (places.data.error_message) {
      logger.error(`google api service error: ${places.data.error_message}`);
    }

    return places.data.results.reduce<Array<IFormattedAddress>>((prev, fields) => {
      if (prev.length < 5) {
        const address = this.formatAddress({ countryCode: region, fields });
        if (address) {
          prev.push(address);
        }
      }
      return prev;
    }, []);
  }

  public async getAddressAutocomplete({
    search,
    radius = 20000,
    latitude = -34.397,
    longitude = 150.644,
    language = 'en',
  }: IGetAddressAutocompleteProps) {
    const places = await axios.get<IGetAddressAutocompleteResponse>(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json',
      {
        params: {
          key: this.apiKey,
          input: search,
          types: 'address',
          radius,
          location: latitude && longitude ? `${latitude},${longitude}` : undefined,
          language,
        },
      }
    );

    if (places.data.error_message) {
      logger.error(`google api service error: ${places.data.error_message}`);
    }

    const result = places.data.predictions.map((place) => ({ description: place.description, id: place.place_id }));

    return result;
  }

  public async getAddressAutocompleteDetails({ placeId, language = 'en' }: IGetAddressAutocompleteDetailsProps) {
    const place = await axios.get<IGetAddressAutocompleteDetailsResponse>(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          key: this.apiKey,
          place_id: placeId,
          fields: ['address_components', 'geometry', 'icon', 'name'],
          language,
        },
      }
    );

    if (place.data.error_message) {
      logger.error(`google api service error: ${place.data.error_message}`);
    }

    if (!place.data.result) {
      return;
    }

    const result = this.formatAddress({ fields: place.data.result });

    return result;
  }
}

export const googlePlaceAPIService = new GooglePlaceAPIService();
