import type { RequestHandler } from "express";
import * as logger from "@/lib/logging";

export const loggingMiddleware: RequestHandler = (req, _res, next) => {
  let message = `${req.originalUrl}`;
  if (req.ip) {
    message = `(${req.ip}) ${message}`;
  }
  logger.debug(req.method, message);
  next();
};
