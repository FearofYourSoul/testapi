import { createLogger, format, transports } from 'winston';

const formatMessage = format.printf(({ timestamp, message, level }) => {
  return `${timestamp} [${level}]: ${message}`;
});

export const logger = createLogger({
  level: process.env.LOG_LEVEL,
  format: format.combine(
    format.timestamp({ format: process.env.NODE_ENV === 'development' ? 'HH:mm:ss' : 'DD-MM-YYYY HH:mm:ss' }),
    format.errors({ stack: true }),
    format.colorize({ colors: { info: 'blue', warn: 'yellow', error: 'red' } }),
    format.prettyPrint(),
    formatMessage
  ),
  defaultMeta: { service: 'user-service' },
  transports: [new transports.Console()],
});
