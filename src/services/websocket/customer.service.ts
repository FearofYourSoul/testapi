import { EBookingStatus, ETransactionStatus } from '@prisma/client';

import { TSocket, TSocketServer } from './ws.service';

export interface ICustomerBookingStatus {
  id: string;
  status: EBookingStatus;
  payment?: {
    paymentId: string;
    status: ETransactionStatus;
  }
}

export interface ICanceledBooking {
  bookingNumber: number;
  clientId: string;
  clientName?: string | null;
  endTime: string | Date;
  id: string;
  notificationId: string;
  placeId: string;
  startTime: string | Date;
  status: EBookingStatus;
}

export class WSCustomerService {
  constructor(private io: TSocketServer) {}

  public async initCustomer(socket: TSocket, clientId: string) {
    await socket.join(clientId);
  }

  public async leaveCustomer(socket: TSocket, clientId: string) {
    await socket.leave(clientId);
    socket.disconnect();
  }

  public sendCanceledBooking(data: ICanceledBooking) {
    if (!data.clientId || !data.placeId) {
      return;
    }
    this.io.in(data.placeId).emit('onCancelBooking', data);
  }

  public sendChangedBookingStatus(booking: ICustomerBookingStatus & { clientId: string }) {
    this.io.in(booking.clientId).emit('onCustomerBookingStatusChange', booking);
  }
}
