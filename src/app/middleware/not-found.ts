import type { RequestHandler } from "express";
import { HttpError } from "../utils/http-error";

export const notFoundMiddleware: RequestHandler = (req) => {
  throw new HttpError(
    "NOT_FOUND",
    `Route "${req.originalUrl}" Not Found`,
    {
      cause: {
        ip: req.ip,
        originalUrl: req.originalUrl,
        method: req.method,
      },
    },
    {
      availableRoutes: [],
      originalUrl: req.originalUrl,
      method: req.method,
    },
    true,
  );
};
