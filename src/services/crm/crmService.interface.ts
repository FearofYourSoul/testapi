export interface ExternalTable {
  id: string;
  name: string;
  seats: number;
}

export interface ExternalSchema {
  width: number;
  height: number;
  tables: {
    tableId: string;
    x: number;
    y: number;
    z?: number;
    angle?: number;
    width?: number;
    height?: number; 
  }[]
}

export interface ExternalSection {
  id: string;
  name: string;
  tables: ExternalTable[];
  schema: ExternalSchema | null;
}

export interface ExternalReserve {
  id: string;
  tableIds: string[];
  startTime: string;
  durationInMinutes?: number;
  guestsCount?: number;
}

export interface ExternalReserveDTO {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  durationInMinutes?: number;
  guestsCount: number;
  startTime: string;
  tableIds: string[];
}

export type ExternalReserveID = string;

export type ExternalReserveCreationStatus = "Success" | "Error" | "InProgress";

export abstract class CrmService {
  placeId: string;

  constructor(placeId: string) {
    this.placeId = placeId;
  }

  abstract autheticate(): Promise<void>;

  // Could be bar, hall, floor 1, floor 2, etc.
  abstract getSections(): Promise<ExternalSection[]>;

  abstract getReserves(sectionIds: string[], dateFrom?: string, dateTo?: string): Promise<ExternalReserve[]>;

  // create a new reserve.
  abstract createReserve(reserve: ExternalReserveDTO): Promise<ExternalReserveID>;

  abstract getReserveCreationStatus(reserveId: ExternalReserveID): Promise<ExternalReserveCreationStatus>;

}