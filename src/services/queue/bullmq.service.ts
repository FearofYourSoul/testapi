import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import dayjs from 'dayjs';

import { WSService } from '../websocket';
import { IExpiredOrderJob, expiredBookingHandler, handleCompletedExpiryBooking } from './handlers';

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '7555'),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
});

enum EQueueNames {
  EXPIRED_ORDER = 'expiredOrder',
}

interface IAddJobParams {
  bookingId: string;
  expiredAt: string;
}

interface IInitJobListeners {
  wsService: WSService;
}

type TCompletedJobData = IExpiredOrderJob;

export class BullMqService {
  public expiredOrderQueue = new Queue<IExpiredOrderJob>(EQueueNames.EXPIRED_ORDER, { connection });
  public expiredOrderWorker = new Worker<IExpiredOrderJob>(EQueueNames.EXPIRED_ORDER, expiredBookingHandler, {
    connection,
  });

  public async addBookingExpiryJob({ bookingId, expiredAt }: IAddJobParams) {
    const delay = dayjs(expiredAt).subtract(Date.now(), 'milliseconds').toDate().getTime();
    await this.expiredOrderQueue.add(
      EQueueNames.EXPIRED_ORDER,
      { bookingId },
      { delay, removeOnComplete: 200, removeOnFail: 500, jobId: bookingId }
    );
  }

  public async removeBookingExpiryJob(jobId: string) {
    await this.expiredOrderQueue.remove(jobId);
  }

  public initJobListeners({ wsService }: IInitJobListeners) {
    this.expiredOrderWorker.addListener('completed', async (job: Job<TCompletedJobData, any, EQueueNames>) => {
      switch (job.name) {
        case EQueueNames.EXPIRED_ORDER:
          handleCompletedExpiryBooking({ wsService, job });
          break;

        default:
          break;
      }
    });
  }
}

export const bullMqService = new BullMqService();
