import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  CrmService,
  ExternalReserveDTO,
  ExternalReserve,
  ExternalSection,
  ExternalReserveCreationStatus,
} from './crmService.interface';
import { prisma } from '../../utils/prisma';
import dayjs from 'dayjs';

interface IikoExternalOrganization {
  responseType: string;
  id: string;
  name: string;
}

interface IikoExternalTerminalGroup {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  timeZone: string;
}

interface IikoExternalSection {
  id: string;
  name: string;
  terminalGroupId: string;
  tables: IikoExternalTable[];
  schema: IikoExternalSchema | null;
}

interface IikoExternalTable {
  id: string;
  name: string;
  number: number;
  seatingCapacity: number;
  revision: number;
  isDeleted: boolean;
}

interface IikoExternalSchema {
  width: number;
  height: number;
  markElements: unknown[]; // TODO: add type
  rectangleElements: unknown[]; // TODO: add type
  ellipseElements: unknown[]; // TODO: add type
  tableElements: IikoExternalSchemaTableElement[];
}

interface IikoExternalSchemaTableElement {
  tableId: string;
  x: number;
  y: number;
  z: number;
  angle: number;
  width: number;
  height: number;
}

interface IikoExternalReserve {
  id: string;
  tableIds: string[];
  estimatedStartTime: string;
  durationInMinutes: number;
  guestsCount: number;
}

interface IikoExternalCustomer {
  type: 'regular' | 'one-time';
  id: string;
  name: string;
  surname: string | null;
  comment: string | null;
  gender: 'NotSpecified' | 'Male' | 'Female';
  inBlacklist: boolean;
  blacklistReason: string | null;
  birthdate: string | null;
}

interface IikoExternalReserveInfo {
  customer: IikoExternalCustomer;
  guestsCount: number;
  comment: string | null;
  durationInMinutes: number;
  shouldRemind: boolean;
  status: 'New' | 'Started' | 'Closed';
  cancelReason: 'ClientNotAppeared' | 'ClientRefused' | 'Other' | null;
  tableIds: string[];
  estimatedStartTime: string;
  guestsComingTime: string | null;
  order: unknown | null;
}

interface IikoResponse {
  correlationId: string;
}
interface IikoAuthResponse extends IikoResponse {
  token: string;
}

interface IikoReserveOrganizationsResponse extends IikoResponse {
  organizations: IikoExternalOrganization[];
}

interface IikoReserveTerminalGroupsResponse extends IikoResponse {
  terminalGroups: {
    organizationId: string;
    items: IikoExternalTerminalGroup[];
  }[];
}

interface IikoReserveSectionsResponse extends IikoResponse {
  restaurantSections: IikoExternalSection[];
  revision: number;
}

interface IikoReservesResponse extends IikoResponse {
  reserves: IikoExternalReserve[];
}

interface IikoCreateReserveResponse extends IikoResponse {
  reserveInfo: {
    id: string;
    externalNumber: number | null;
    organizationId: string;
    timestamp: number;
    creationStatus: string;
    errorInfo: {
      code: string;
      message: string | null;
      description: string | null;
      additionalData: unknown | null;
    } | null;
    isDeleted: boolean;
    reserve: unknown | null;
  };
}

interface IikoGetReserveResponse extends IikoResponse {
  reserves: {
    id: string;
    externalNumber: string | null;
    organizationId: string;
    timestamp: number;
    creationStatus: 'Success' | 'Error' | 'InProgress';
    errorInfo: {
      code: string;
      message: string | null;
      description: string | null;
      additionalData: any | null;
    } | null;
    isDeleted: boolean;
    reserve: IikoExternalReserveInfo | null;
  }[];
}

const MAX_ERROR_COUNT = 5;

export class IikoCrmService extends CrmService {
  client: AxiosInstance;
  token: string | null = null;
  errorsCount = 0;
  organizationId: string | null = null;
  terminalGroupId: string | null = null;

  constructor(organizationId: string) {
    super(organizationId);

    this.client = axios.create({
      baseURL: process.env.IIKO_API_URL,
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
    });
  }

  async _handleAuthError<FetchedData>(error: AxiosError, subject: string, getData: Function): Promise<FetchedData> {
    if (this.errorsCount > MAX_ERROR_COUNT) {
      throw new Error(`Invalid credentials for iiko restaurant ${this.placeId}. Retry limit exceeded`);
    }
    console.log(`Iiko token is expired while ${subject} for restaurant ${this.placeId}, trying to refresh`);
    await this.autheticate();
    console.log(`Iiko token for restaurant ${this.placeId} is refreshed. Trying to ${subject} again`);
    return getData();
  }

  async autheticate(): Promise<void> {
    const place = await prisma.iikoPlace.findFirst({
      where: {
        id: this.placeId,
      },
    });

    if (!place) {
      throw new Error(`Iiko restaurant with internal id ${this.placeId} is not found`);
    }

    if (!place.api_login) {
      throw new Error(`Iiko restaurant with internal id ${this.placeId} has no api login`);
    }

    if (!place.organization_id) {
      throw new Error(`Iiko restaurant with internal id ${this.placeId} has no organization id`);
    }

    if (!place.terminal_group_id) {
      throw new Error(`Iiko restaurant with internal id ${this.placeId} has no terminal group id`);
    }

    this.organizationId = place.organization_id;
    this.terminalGroupId = place.terminal_group_id;

    try {
      const { data } = await this.client.post<IikoAuthResponse>('/access_token', {
        apiLogin: place.api_login,
      });

      this.client.defaults.headers.common['authorization'] = `Bearer ${data.token}`;
    } catch (error) {
      if (!(error instanceof AxiosError)) {
        throw error;
      }
      if (error.response?.status === 401) {
        throw new Error(`Invalid credentials for iiko restaurant with internal id ${this.placeId}`);
      }
    }
  }

  async getAvailableOrganizations(): Promise<IikoExternalOrganization[]> {
    try {
      const { data } = await this.client.post<IikoReserveOrganizationsResponse>('/reserve/available_organizations', {});
      return data.organizations;
    } catch (error) {
      this.errorsCount++;
      if (!(error instanceof AxiosError)) {
        throw error;
      }
      if (error.response?.status === 401) {
        return this._handleAuthError(error, 'get available organizations', this.getAvailableOrganizations);
      } else {
        throw error;
      }
    }
  }

  async getAvailableTerminalGroups(): Promise<IikoExternalTerminalGroup[]> {
    try {
      const { data } = await this.client.post<IikoReserveTerminalGroupsResponse>('/reserve/available_terminal_groups', {
        organizationIds: [this.organizationId],
      });
      return data.terminalGroups[0].items;
    } catch (error) {
      this.errorsCount++;
      if (!(error instanceof AxiosError)) {
        throw error;
      }
      if (error.response?.status === 401) {
        return this._handleAuthError(error, 'get available terminal groups', this.getAvailableTerminalGroups);
      } else {
        throw error;
      }
    }
  }

  async getSections(): Promise<ExternalSection[]> {
    const organizations = await this.getAvailableOrganizations();
    if (!organizations.length) {
      throw new Error(`No available organizations found for iiko restaurant ${this.placeId}`);
    }

    const organization = organizations.find((org) => org.id === this.organizationId);

    if (!organization) {
      throw new Error(
        `The organization ${this.organizationId} for restaurant ${this.placeId} is not available for reservation`
      );
    }

    const terminalGroups = await this.getAvailableTerminalGroups();
    if (!organizations.length) {
      throw new Error(
        `No available terminal groups found for iiko restaurant ${this.placeId} and organization ${this.organizationId}`
      );
    }

    const terminalGroup = terminalGroups.find((group) => group.id === this.terminalGroupId);

    if (!terminalGroup) {
      throw new Error(
        `The terminal group ${this.terminalGroupId} for restaurant ${this.placeId} and organization ${this.organizationId} is not available for reservation`
      );
    }

    try {
      const { data } = await this.client.post<IikoReserveSectionsResponse>('/reserve/available_restaurant_sections', {
        terminalGroupIds: [this.terminalGroupId],
        returnSchema: true,
      });

      return data.restaurantSections.map((section) => ({
        id: section.id,
        name: section.name,
        tables: section.tables.map((table) => ({
          id: table.id,
          name: table.name,
          seats: table.seatingCapacity,
        })),
        schema: section.schema
          ? {
              ...section.schema,
              tables: section.schema.tableElements,
            }
          : null,
      }));
    } catch (error) {
      this.errorsCount++;
      if (!(error instanceof AxiosError)) {
        throw error;
      }
      if (error.response?.status === 401) {
        return this._handleAuthError(error, 'get available sections', this.getSections);
      } else {
        throw error;
      }
    }
  }

  async getReserves(sectionIds: string[], dateFrom?: string, dateTo?: string): Promise<ExternalReserve[]> {
    const dateStart = dateFrom || dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
    const dateEnd =
      dateTo || dayjs(dateFrom, 'YYYY-MM-DD HH:mm:ss.SSS').add(1, 'day').format('YYYY-MM-DD HH:mm:ss.SSS');

    try {
      const { data } = await this.client.post<IikoReservesResponse>('/reserve/restaurant_sections_workload', {
        restaurantSectionIds: sectionIds,
        dateFrom: dateStart,
        dateTo: dateEnd,
      });

      return data.reserves.map((reserve) => ({
        id: reserve.id,
        tableIds: reserve.tableIds,
        startTime: reserve.estimatedStartTime,
        durationInMinutes: reserve.durationInMinutes,
        guestsCount: reserve.guestsCount,
      }));
    } catch (error) {
      this.errorsCount++;
      if (!(error instanceof AxiosError)) {
        throw error;
      }
      if (error.response?.status === 401) {
        return this._handleAuthError(error, 'get reserves', this.getReserves);
      } else {
        throw error;
      }
    }
  }

  async createReserve(reserve: ExternalReserveDTO): Promise<string> {
    try {
      const { data } = await this.client.post<IikoCreateReserveResponse>('/reserve/create', {
        organizationId: this.organizationId,
        terminalGroupId: this.terminalGroupId,
        customer: {
          type: 'one-time', // TODO: make it configurable. Can be regular | one-time
          name: reserve.customerName,
          gender: 'NotSpecified',
          email: reserve.customerEmail,
        },
        phone: reserve.customerPhone,
        durationInMinutes: reserve.durationInMinutes,
        shouldRemind: false, // TODO: make it configurable
        tableIds: reserve.tableIds,
        estimatedStartTime: reserve.startTime,
        guests: {
          count: reserve.guestsCount,
        },
      });

      return data.reserveInfo.id;
    } catch (error) {
      this.errorsCount++;
      if (!(error instanceof AxiosError)) {
        throw error;
      }
      if (error.response?.status === 401) {
        return this._handleAuthError(error, 'create reserve', this.createReserve);
      } else {
        throw error;
      }
    }
  }

  async getReserveCreationStatus(reserveId: string): Promise<ExternalReserveCreationStatus> {
    try {
      const { data } = await this.client.post<IikoGetReserveResponse>('/reserve/status_by_id', {
        organizationId: this.organizationId,
        reserveIds: [reserveId],
      });

      if (!data.reserves[0]) {
        throw new Error(`No reserve found with id ${reserveId} for restaurant ${this.placeId}`);
      }

      return data.reserves[0].creationStatus;
    } catch (error) {
      this.errorsCount++;
      if (!(error instanceof AxiosError)) {
        throw error;
      }
      if (error.response?.status === 401) {
        return this._handleAuthError(error, 'get reserve', this.getReserveCreationStatus);
      } else {
        throw error;
      }
    }
  }
}
