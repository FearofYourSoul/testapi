import { RequestHandler } from 'express';
import { logger } from '../log';

export const handleBepaidSuccess: RequestHandler = async (req, res) => {
  logger.info(`Received bepaid success. Params ${JSON.stringify(req.query)}`);
  res.send(
    `<html style="background-color: ${
      req.query.theme === 'dark' ? '#1f1f1f' : '#fff'
    }"><head></head><body></body></html>`
  );
};

export const handleBepaidDecline: RequestHandler = async (req, res) => {
  logger.info(`Received bepaid decline. Params ${JSON.stringify(req.query)}`);
  res.send(
    `<html style="background-color: ${
      req.query.theme === 'dark' ? '#1f1f1f' : '#fff'
    }"><head></head><body></body></html>`
  );
};

export const handleBepaidFail: RequestHandler = async (req, res) => {
  logger.info(`Received bepaid fail. Params ${JSON.stringify(req.query)}`);
  res.send(
    `<html style="background-color: ${
      req.query.theme === 'dark' ? '#1f1f1f' : '#fff'
    }"><head></head><body></body></html>`
  );
};

export const handleBepaidCancel: RequestHandler = async (req, res) => {
  logger.info(`Received bepaid cancel. Params ${JSON.stringify(req.query)}`);
  res.send(
    `<html style="background-color: ${
      req.query.theme === 'dark' ? '#1f1f1f' : '#fff'
    }"><head></head><body></body></html>`
  );
};
