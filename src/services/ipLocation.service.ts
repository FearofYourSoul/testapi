import axios, { AxiosInstance } from 'axios';

interface IGetLocationByIPv4Results {
  regionCode: string;
  countryName: string;
  // TODO: add lat and lng with premium subscription
}

interface IGetLocationData {
  ip: string;
  ip_number: string;
  ip_version: number;
  country_name: string;
  country_code2: string;
  isp: string;
  response_code: string;
  response_message: string;
}

interface IGetIpData {
  ip: string;
  response_code: string;
  response_message: string;
}

class IPLocationService {
  private axiosInstance: AxiosInstance;

  constructor() {
    if (!process.env.IP_LOCATION_API_URL) {
      throw new Error('ENV: IP_LOCATION_API_URL is not defined');
    }
    this.axiosInstance = axios.create({ baseURL: process.env.IP_LOCATION_API_URL });
  }

  async getLocationByIPv4(ip: string): Promise<IGetLocationByIPv4Results> {
    const response = await this.axiosInstance.get<IGetLocationData>('/', {
      params: {
        ip,
      },
    });
    const { country_name, country_code2 } = response.data;

    return {
      countryName: country_name,
      regionCode: country_code2,
    };
  }

  async getServerIPv4() {
    const response = await this.axiosInstance.get<IGetIpData>('/', {
      params: {
        cmd: 'get-ip',
      },
    });
    return response.data.ip;
  }
}

export const ipLocationService = new IPLocationService();
