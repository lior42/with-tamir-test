import type { ErrorRequestHandler } from "express";
import * as logger from "@/lib/logging";
import { env } from "../startup/env-load";
import { HTTP_CODES } from "../utils/http-codes";
import { HttpError } from "../utils/http-error";

const context = "ErrorHandler";

export const globalErrorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  next,
) => {
  if (!(err instanceof HttpError && err.disableLogs)) {
    logger.error(context, err);
  }

  if (res.headersSent) {
    return next(err);
  }

  let handleErr = err;

  if (!(err instanceof Error)) {
    handleErr = new HttpError(500, `Unknown Error Caught`, { cause: err });
  }

  const asGoodError = handleErr as Error;

  let statusCode = 500;
  const message = asGoodError.message;
  const name = asGoodError.name;

  const extraFields: Record<string, any> =
    env.NODE_ENV === "development"
      ? {
          stack: asGoodError.stack,
          cause: asGoodError.cause,
        }
      : {};

  if (asGoodError instanceof HttpError) {
    if (typeof asGoodError.statusCode === "number") {
      statusCode = asGoodError.statusCode;
    } else {
      statusCode = HTTP_CODES[asGoodError.statusCode];
    }
    if (asGoodError.extraInfo) {
      extraFields.additionalData = asGoodError.extraInfo;
    }
  }

  res.status(statusCode).json({
    statusCode,
    name,
    message,
    ...extraFields,
  });
};
