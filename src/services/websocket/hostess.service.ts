import { prisma } from '../../utils';
import { getRoomId, IClientToServerEvents, TAcceptBooking, TBookingTable, TSocket, TSocketServer } from './ws.service';

export class WSHostessService {
  constructor(private io: TSocketServer) {}

  public async initHostess(socket: TSocket, placeId: string) {
    // const ownerData = socket.data.owner;
    // const employeeData = socket.data.employee;

    socket.join(placeId);
  }

  public async sendBookedTable(tableInfo: TBookingTable & { notificationId: string }) {
    if (!tableInfo.PlaceTable?.id || !tableInfo) return;

    const place = await this.getManagerPlace(tableInfo.PlaceTable.id);
    if (!place) return;

    const ids = this.getManagerRooms({ id: place.id, startTime: tableInfo.start_time, endTime: tableInfo.end_time });

    this.io.in(ids).emit('onBookTable', tableInfo);
  }

  public async onCustomerCall(
    socket: TSocket,
    { state, phoneNumber, placeId }: Parameters<IClientToServerEvents['customerCall']>[0]
  ) {
    if (state === 'idle') {
      return this.io.in(placeId).emit('customerCall', {
        state,
        phone_number: phoneNumber,
      });
    }
    const client = await prisma.client.findFirst({
      where: {
        phone_number: phoneNumber,
        VisitedPlace: {
          some: {
            Place: {
              id: placeId,
              OR: [
                { owner_id: socket.data.owner?.id },
                {
                  Employee: {
                    some: {
                      employee_id: socket.data.employee?.id,
                    },
                  },
                },
              ],
            },
          },
        },
      },
      select: {
        first_name: true,
        last_name: true,
        phone_number: true,
      },
    });

    if (!client?.phone_number || !client.phone_number) {
      return this.io.in(placeId).emit('customerCall', {
        state,
        phone_number: phoneNumber,
      });
    }

    this.io.in(placeId).emit('customerCall', { ...client, phone_number: client.phone_number!, state });
  }

  public async sendBookingStatus(data: TAcceptBooking) {
    const place = await this.getManagerPlace(data.PlaceTable.id);

    if (!place) return;

    const ids = this.getManagerRooms({ id: place.id, startTime: data.start_time, endTime: data.end_time });
    this.io.in(ids).emit('onBookingStatusChange', data);
  }

  private getManagerRooms({
    id,
    startTime,
    endTime,
  }: {
    id: string;
    startTime: Date | string;
    endTime: Date | string;
  }) {
    const firstId = getRoomId({ id, timestamp: startTime });
    const secondId = getRoomId({ id, timestamp: endTime });
    const ids = [firstId, id];
    if (firstId !== secondId) {
      ids.push(secondId);
    }
    return ids;
  }

  private async getManagerPlace(tableId: string) {
    const place = await prisma.place.findFirst({
      where: {
        PlaceSection: {
          some: {
            PlaceTable: {
              some: {
                id: tableId,
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    return place;
  }
}
