import 'dotenv/config';
import * as trpcExpress from '@trpc/server/adapters/express';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import os from 'os';

import { i18nMiddleware } from './utils';
import { logger } from './log';
import { appRouter, createContext } from './routes';
import {
  authService,
  IClientToServerEvents,
  IInterServerEvents,
  IServerToClientEvents,
  ISocketData,
  WSService,
} from './services';
import { morganMiddleware } from './middlewares/morgan';
import {
  handleBepaidCancel,
  handleBepaidDecline,
  handleBepaidFail,
  handleBepaidSuccess,
  handleBepaidWebhook,
  verifyEmail,
} from './http';
import { bullMqService } from './services/queue/bullmq.service';

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
});

const frizzer = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();
const httpServer = createServer(app);
const io = new Server<IClientToServerEvents, IServerToClientEvents, IInterServerEvents, ISocketData>(httpServer, {
  cors: {
    origin: '*',
  },
});

const wsService = new WSService(io);

bullMqService.initJobListeners({ wsService });

app.use(cors({ origin: '*' }));

app.use(
  bodyParser.json({
    // TODO: size?
    limit: process.env.API_PAYLOAD_LIMIT || '10mb',
  })
);
app.use(authService.passport.initialize());

app.use(i18nMiddleware);
app.use(morganMiddleware);

app.use('/api/trpc/auth.client.mobile.getCode', limiter);
app.use('/api/trpc/auth.client.mobile.getCode', frizzer);

app.use(
  '/api/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: (opts) => createContext(opts, wsService),
    onError: (opts) => {
      const { error, type, path, input, ctx, req } = opts;
      const RED = '\x1b[1;31m';
      const NC = '\x1b[0m';
      const userInput =
        process.env.NODE_ENV === 'development' ? `\ninput:\n${JSON.stringify(input ?? {}, null, 2)}` : '';
      logger.error(`${RED}${error.code}: ${error.message}${NC}${userInput}\n${error.stack}`);
    },
  })
);

app.get('/api/client/email-verification', verifyEmail);
app.post('/api/wh/bepaid', handleBepaidWebhook(wsService));
app.get('/api/bepaid/success', handleBepaidSuccess);
app.get('/api/bepaid/decline', handleBepaidDecline);
app.get('/api/bepaid/fail', handleBepaidFail);
app.get('/api/bepaid/cancel', handleBepaidCancel);

const PORT = Number(process.env.PORT || 4000);

httpServer.listen(PORT, () => {
  logger.info(`🚀 api started on port: ${PORT}`);
  logger.info(`database: ${process.env.DATABASE_URL?.split('@')[1]}`);
  if (process.env.BEPAID_TEST_MODE === 'true') {
    logger.info(`🤖 BePaid will be used in development mode`);
  } else {
    logger.info(`👀 BePaid will be used in production mode`);
  }
  if (process.env.NODE_ENV === 'development') {
    const networks = os.networkInterfaces();
    const localIP = (networks['en0'] || networks['eth0'] || networks['wlo1'])?.find(
      (data) => data.family === 'IPv4'
    )?.address;
    if (localIP) {
      logger.info(`server waiting on http://${localIP}:${PORT}`);
    }
  }
});
