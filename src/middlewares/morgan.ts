import { logger } from '../log';
import morgan from 'morgan';

const RED = '\x1b[1;31m';
const NC = '\x1b[0m';

export const morganMiddleware = morgan(
  function (tokens, req, res) {
    const status = tokens.status(req, res);
    const isError = Number(status) >= 400;
    const [uri = ''] = tokens.url(req, res)?.split('?') ?? [];

    const message = [tokens.method(req, res), status, uri, tokens['response-time'](req, res), 'ms'].join(' ');

    return isError ? RED + message + NC : message;
  },
  {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
  }
);
