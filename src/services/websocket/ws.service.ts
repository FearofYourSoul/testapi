import dayjs from 'dayjs';
import { Server, Socket } from 'socket.io';
import { LRUCache } from 'lru-cache';
import { verify, JwtPayload } from 'jsonwebtoken';

import { WebsocketError } from '../../utils';
import { authService, EAppId, IEmployeePayload, IOwnerPayload } from '../auth.service';
import { WSHostessService } from './hostess.service';
import { TRouterOutput } from '../../routes';
import {
  ICanceledBooking,
  ICustomerBookingStatus,
  WSCustomerService,
} from './customer.service';

export type TBookingTable = Omit<
  TRouterOutput['manager']['booking']['list']['bookings'][0],
  'end_time' | 'start_time' | 'created_at'
> &
  Record<'end_time' | 'start_time' | 'created_at', Date | string>;
type TChangeStatusData = TRouterOutput['manager']['booking']['changeStatus'];
export type TAcceptBooking = Omit<TChangeStatusData, 'end_time' | 'start_time' | 'user'> &
  Record<'end_time' | 'start_time', Date | string> & { notificationId: string } & { user?: TChangeStatusData['user'] };

// export type TBookingTable = TRouterOutput['manager']['booking']['list']['bookings'][0] | { created_at: Date, start_time: Date; end_time: Date };
// export type TAcceptBooking = TRouterOutput['manager']['booking']['changeStatus'] | { start_time: Date; end_time: Date };

interface ICall {
  phone_number: string;
  state: 'ringing' | 'idle';
  first_name?: string | null;
  last_name?: string | null;
}

export interface IServerToClientEvents {
  customerCall: (props: ICall) => void;
  error: (err: WebsocketError) => void;
  onBookTable: (tableInfo: TBookingTable & { notificationId: string }) => void;
  onBookingStatusChange: (bookedTable: TAcceptBooking) => void;
  onCancelBooking: (data: ICanceledBooking) => void;
  onCustomerBookingStatusChange: (bookedTable: ICustomerBookingStatus) => void;
}

export interface IClientToServerEvents {
  customerCall: (data: { state: 'ringing' | 'idle'; placeId: string; phoneNumber: string }) => void;
  enterToTable: (data: ITableDate) => void;
  hostessConnect: (data: IPlaceIdProps) => void;
  initCustomer: () => void;
  leaveCustomer: () => void;
  leaveTable: () => void;
}

export interface IInterServerEvents {
  tablesInfo: () => void;
}

export interface ISocketData {
  client?: { id: string };
  owner?: IOwnerPayload;
  employee?: IEmployeePayload;
  timestamp: string;
}

export type TSocketServer = Server<IClientToServerEvents, IServerToClientEvents, IInterServerEvents, ISocketData>;

export type TSocket = Socket<IClientToServerEvents, IServerToClientEvents, IInterServerEvents, ISocketData>;

interface ITableDate {
  tableId: string;
  timestamp: Date;
}

interface IIdProps {
  id: string;
  timestamp: Date | string;
}

interface IPlaceIdProps {
  placeId: string;
}

export const getRoomId = ({ id, timestamp }: IIdProps) => {
  const startTime = dayjs(timestamp).startOf('date').toISOString();
  const endTime = dayjs(timestamp).endOf('date').toISOString();
  return `${id}|${startTime}|${endTime}`;
};

export const getSocketRooms = ({ id, timestamp }: IIdProps) => {
  const currentDay = dayjs(timestamp).get('date');
  const prevDay = dayjs(timestamp).add(4, 'hour');
  const nextDay = dayjs(timestamp).add(4, 'hour');
  const ids = [getRoomId({ id, timestamp })];
  if (nextDay.get('date') !== currentDay) {
    ids.push(getRoomId({ id, timestamp: nextDay.toDate() }));
  }
  if (prevDay.get('date') !== currentDay) {
    ids.push(getRoomId({ id, timestamp: prevDay.toDate() }));
  }
  return ids;
};

const cache = new LRUCache<string, string>({
  // object lifetime (5 min)
  ttl: 5 * 60 * 1000,
  // checks period (5 min)
  ttlResolution: 1 * 60 * 1000,
  ttlAutopurge: false,
  // TODO: MAX_KEYS  env
  max: 1000,
});

export class WSService {
  public hostessService: WSHostessService;
  public customerService: WSCustomerService;

  constructor(private io: TSocketServer) {
    this.hostessService = new WSHostessService(io);
    this.customerService = new WSCustomerService(io);
    this.initConnection();
  }

  private initConnection() {
    this.io.on('connection', async (socket) => {
      if (socket.handshake.query && typeof socket.handshake.query.token === 'string') {
        try {
          const { role, ...user } = verify(
            socket.handshake.query.token,
            process.env.ACCESS_WS_JWT_SECRET || ''
          ) as JwtPayload & Parameters<typeof authService.generateAccessToken>['0'] & { appId?: EAppId };

          if (user.appId === EAppId.CLIENT_MOBILE) {
            socket.data.client = {
              id: user.id,
            };
            this.customerService.initCustomer(socket, user.id);
          }

          if (user.appId === EAppId.MANAGER) {
            if (cache.get(user.id) !== socket.handshake.query.token) {
              socket.disconnect();
            }

            cache.delete(user.id);

            if (role === 'owner' && user.email) {
              socket.data.owner = {
                id: user.id,
                email: user.email,
              };
            } else if (user.login) {
              socket.data.employee = {
                id: user.id,
                login: user.login,
              };
            }

            if (user.placeId) {
              await this.hostessService.initHostess(socket, user.placeId);
            }
          }
        } catch {
          socket.disconnect();
        }
      }

      socket.on('customerCall', (data) => {
        this.hostessService.onCustomerCall(socket, data);
      });

      // public events
      socket.on('enterToTable', (data) => {
        this.socketEnterTable({ ...data, socketId: socket.id });
      });

      socket.on('leaveTable', () => {
        this.socketLeaveTable(socket);
      });

      socket.on('disconnect', () => {
        this.socketOnDisconnect(socket);
      });
    });
  }

  public setAllowedToken({ id, token }: { id: string; token: string }) {
    cache.set(id, token);
  }

  public sendAcceptBooking(data: TAcceptBooking) {
    const ids = [
      ...getSocketRooms({ id: data.PlaceTable.id, timestamp: data.start_time }),
      ...getSocketRooms({ id: data.PlaceTable.id, timestamp: data.end_time }),
    ].filter((id, i, arr) => i === arr.findIndex((key) => key === id));
    this.io.in(ids).emit('onBookingStatusChange', data);
    this.hostessService.sendBookingStatus(data);
  }

  private socketEnterTable({ socketId, ...input }: ITableDate & { socketId: string }) {
    const roomId = getSocketRooms({ id: input.tableId, timestamp: input.timestamp });
    this.io.in(socketId).socketsJoin(roomId);
  }

  private socketLeaveTable(socket: TSocket) {
    this.socketOnDisconnect(socket);
    if (!socket.data.client?.id) {
      socket.disconnect();
    }
  }

  private socketOnDisconnect(socket: TSocket) {
    this.io.in(socket.id).socketsLeave(Array.from(socket.rooms.keys()).filter((key) => key !== socket.data.client?.id));
  }
}
